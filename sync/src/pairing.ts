/**
 * Pairing codes (lib/pairingCode.ts). One Durable Object keeps every code
 * that a device is waiting with, so codes are unique and the number of
 * waiting codes can be capped.
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
 * Of the 65,536 codes, at most this many wait at once. Someone holding
 * codes to catch a mistyped one can then only catch a small share.
 */
const MAX_WAITING = 1000;

type Row = {
    code: string;
    ticket: string;
    public_key: string;
    sealed: string | null;
    expires_at: number;
};

export class Pairing extends DurableObject<Env> {
    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS codes (
                code TEXT PRIMARY KEY,
                ticket TEXT NOT NULL UNIQUE,
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

    /** A new code for a waiting device, or null if too many are waiting. */
    async create(publicKey: string): Promise<PairResponse | null> {
        this.sweep();
        const [{ count }] = this.sql
            .exec<{ count: number }>('SELECT COUNT(*) AS count FROM codes')
            .toArray();
        if (count >= MAX_WAITING) return null;

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
            'INSERT INTO codes (code, ticket, public_key, expires_at) VALUES (?, ?, ?, ?)',
            code,
            ticket,
            publicKey,
            expiresAt
        );
        if ((await this.ctx.storage.getAlarm()) === null) {
            await this.ctx.storage.setAlarm(expiresAt);
        }
        return { code, ticket, expiresAt };
    }

    /** Seals the secret for the device waiting with `code`. */
    async approve(code: string, secret: string): Promise<boolean> {
        this.sweep();
        const [row] = this.sql
            .exec<Row>(
                'SELECT * FROM codes WHERE code = ? AND sealed IS NULL',
                code
            )
            .toArray();
        if (!row) return false;
        const sealed = await sealSecret(row.public_key, secret);
        // Another approval may have come in while sealing.
        const { rowsWritten } = this.sql.exec(
            'UPDATE codes SET sealed = ? WHERE ticket = ? AND sealed IS NULL',
            JSON.stringify(sealed),
            row.ticket
        );
        return rowsWritten > 0;
    }

    /** The sealed secret for a ticket once approved, after which it's gone. */
    wait(ticket: string): WaitResponse | null {
        this.sweep();
        const [row] = this.sql
            .exec<Row>('SELECT * FROM codes WHERE ticket = ?', ticket)
            .toArray();
        if (!row) return null;
        if (row.sealed === null) return { sealed: null };
        this.sql.exec('DELETE FROM codes WHERE ticket = ?', ticket);
        return { sealed: JSON.parse(row.sealed) as Sealed };
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
