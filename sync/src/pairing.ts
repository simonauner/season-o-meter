/**
 * Pairing codes (lib/pairingCode.ts). One Durable Object keeps every code
 * that a device is waiting with, so codes are unique and the server can cap
 * how many wait and how many wrong codes are entered, across all clients.
 *
 * A device that syncs approves a code by sending the list's secret, which is
 * stored sealed for the waiting device's public key until that device
 * collects it. The server can't read it back.
 */

import { DurableObject } from 'cloudflare:workers';
import {
    isPublicKey,
    newPairingCode,
    PAIRING_CODE_TTL_MS,
    sealSecret,
    type Sealed,
} from '../../lib/pairingCode';
import {
    newSecret,
    type PairResponse,
    type WaitResponse,
} from '../../lib/syncProtocol';
import { fromBase64Url } from '../../lib/userData';

/**
 * Of the 65,536 codes, at most this many wait at once, and at most a few
 * per client. Someone holding codes to catch a mistyped one can then only
 * hold a small share, and can't keep everyone else from getting a code.
 */
const MAX_WAITING = 1000;
const MAX_WAITING_PER_CLIENT = 3;

/**
 * Wrong codes entered per minute, from everyone together. Rate limits per
 * client can be dodged with many addresses; this can't, so guessing stays
 * slow. Over it, entering codes fails for everyone until the minute is up,
 * and the link and QR code still work.
 */
const MAX_WRONG_PER_MINUTE = 60;

export type CreateResult = PairResponse | 'full' | 'too-many';
export type ApproveResult = 'approved' | 'unknown' | 'too-many';

type Row = {
    code: string;
    ticket: string;
    client: string;
    public_key: string;
    sealed: string | null;
    expires_at: number;
};

export class Pairing extends DurableObject<Env> {
    /** Wrong codes in the current minute. Starting over after a restart is fine. */
    private wrong = { minute: 0, count: 0 };

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS codes (
                code TEXT PRIMARY KEY,
                ticket TEXT NOT NULL UNIQUE,
                -- Who asked for the code, as the rate limits count them.
                client TEXT NOT NULL,
                public_key TEXT NOT NULL,
                -- JSON of a Sealed, once a syncing device has approved.
                sealed TEXT,
                expires_at INTEGER NOT NULL
            )
        `);
    }

    private get sql() {
        return this.ctx.storage.sql;
    }

    private sweep() {
        this.sql.exec('DELETE FROM codes WHERE expires_at <= ?', Date.now());
    }

    private count(where: string, ...bindings: string[]) {
        const [{ count }] = this.sql
            .exec<{
                count: number;
            }>(`SELECT COUNT(*) AS count FROM codes ${where}`, ...bindings)
            .toArray();
        return count;
    }

    /** A new code for a waiting device. */
    async create(publicKey: string, client: string): Promise<CreateResult> {
        this.sweep();
        if (this.count('') >= MAX_WAITING) return 'full';
        if (this.count('WHERE client = ?', client) >= MAX_WAITING_PER_CLIENT) {
            return 'too-many';
        }

        let code = newPairingCode();
        while (
            this.sql.exec('SELECT 1 FROM codes WHERE code = ?', code).toArray()
                .length > 0
        ) {
            code = newPairingCode();
        }
        const ticket = newSecret();
        const expiresAt = Date.now() + PAIRING_CODE_TTL_MS;
        this.sql.exec(
            'INSERT INTO codes (code, ticket, client, public_key, expires_at) VALUES (?, ?, ?, ?, ?)',
            code,
            ticket,
            client,
            publicKey,
            expiresAt
        );
        if ((await this.ctx.storage.getAlarm()) === null) {
            await this.ctx.storage.setAlarm(expiresAt);
        }
        return { code, ticket, expiresIn: PAIRING_CODE_TTL_MS };
    }

    /** Seals the secret for the device waiting with `code`. */
    async approve(code: string, secret: string): Promise<ApproveResult> {
        const minute = Math.floor(Date.now() / 60_000);
        if (this.wrong.minute !== minute) this.wrong = { minute, count: 0 };
        if (this.wrong.count >= MAX_WRONG_PER_MINUTE) return 'too-many';

        const [row] = this.sql
            .exec<Row>(
                'SELECT * FROM codes WHERE code = ? AND sealed IS NULL AND expires_at > ?',
                code,
                Date.now()
            )
            .toArray();
        if (!row) {
            this.wrong.count++;
            return 'unknown';
        }
        const sealed = await sealSecret(row.public_key, secret);
        // Another approval may have come in while sealing.
        const { rowsWritten } = this.sql.exec(
            'UPDATE codes SET sealed = ? WHERE ticket = ? AND sealed IS NULL',
            JSON.stringify(sealed),
            row.ticket
        );
        return rowsWritten > 0 ? 'approved' : 'unknown';
    }

    /**
     * The sealed secret for a ticket once approved, or null until then. It
     * stays until the device cancels or the code expires, so a response
     * that gets lost can be asked for again.
     */
    wait(ticket: string): WaitResponse | null {
        const [row] = this.sql
            .exec<Row>(
                'SELECT * FROM codes WHERE ticket = ? AND expires_at > ?',
                ticket,
                Date.now()
            )
            .toArray();
        if (!row) return null;
        return {
            sealed:
                row.sealed === null ? null : (JSON.parse(row.sealed) as Sealed),
        };
    }

    /** Forgets a code, when its device has connected or stopped waiting. */
    cancel(ticket: string) {
        this.sql.exec('DELETE FROM codes WHERE ticket = ?', ticket);
    }

    async alarm() {
        this.sweep();
        const [{ next }] = this.sql
            .exec<{
                next: number | null;
            }>('SELECT MIN(expires_at) AS next FROM codes')
            .toArray();
        if (next !== null) await this.ctx.storage.setAlarm(next);
    }
}

export const pairing = (env: Env) =>
    env.PAIRING.get(env.PAIRING.idFromName('pairing'));

/** True if a public key is a P-256 point the server can seal for. */
export async function canSealFor(publicKey: unknown): Promise<boolean> {
    if (!isPublicKey(publicKey)) return false;
    try {
        await crypto.subtle.importKey(
            'raw',
            fromBase64Url(publicKey),
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            []
        );
        return true;
    } catch {
        return false;
    }
}
