/**
 * Sync server for Season-o-meter. One Durable Object per synced list holds
 * its ratings, watchlist and friends in SQLite, and merges changes from devices with
 * the same "latest change wins" rule as the site (lib/userData.ts). Pairing
 * codes, which connect a new device to a list, are in pairing.ts.
 */

import { DurableObject } from 'cloudflare:workers';
import {
    isListId,
    isSecret,
    listIdFor,
    type ListResponse,
    type SyncResponse,
} from '../../lib/syncProtocol';
import { sanitize, shareable, type UserData } from '../../lib/userData';
import { parsePairingCode } from '../../lib/pairingCode';
import { canSealFor, pairing } from './pairing';

export { Pairing } from './pairing';

/** Far more than anyone rates, but keeps a list from growing without bound. */
const MAX_ENTRIES = 50_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const DELETED_KEY = 'deleted';

class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message);
    }
}

type Row = { key: string; value: number | string | null; updated_at: number };

const toData = (rows: Iterable<Row>): UserData =>
    Object.fromEntries(
        [...rows].map((row) => [row.key, [row.value, row.updated_at]])
    );

export class SyncList extends DurableObject<Env> {
    private get sql() {
        return this.ctx.storage.sql;
    }

    private lastSeq() {
        const [{ last }] = this.sql
            .exec<{ last: number | null }>(
                'SELECT MAX(seq) AS last FROM entries'
            )
            .toArray();
        return last ?? 0;
    }

    /** How the entries table was created, or null if it hasn't been. */
    private tableSql() {
        const [table] = this.sql
            .exec<{
                sql: string;
            }>(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
            )
            .toArray();
        return table?.sql ?? null;
    }

    private createTable() {
        // Lists from before friends had a numeric value column, which would
        // turn a friend named "42" into the number 42. Copied into a new one.
        const old = /value INTEGER/.test(this.tableSql() ?? '');
        if (old) this.sql.exec('ALTER TABLE entries RENAME TO entries_old');
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS entries (
                key TEXT PRIMARY KEY,
                -- No type, so ratings stay numbers and names stay text.
                value,
                updated_at INTEGER NOT NULL,
                -- Bumped on every write, so devices can ask for what's new.
                seq INTEGER NOT NULL
            );
        `);
        if (old) {
            this.sql.exec(`
                INSERT INTO entries SELECT key, value, updated_at, seq
                FROM entries_old;
                DROP TABLE entries_old;
            `);
        }
        this.sql.exec(
            'CREATE INDEX IF NOT EXISTS entries_seq ON entries (seq)'
        );
    }

    /** Whether the list has been deleted, which is kept for good. */
    private deleted() {
        return this.ctx.storage.kv.get(DELETED_KEY) !== undefined;
    }

    /** Merges a device's changes and returns what changed since `since`. */
    sync(since: number, changes: UserData): SyncResponse {
        return this.ctx.storage.transactionSync(() => {
            // Devices that still sync with it would otherwise bring it back.
            if (this.deleted()) throw new HttpError(410, 'List deleted');

            // Tables are only created on the first write, so reading a list
            // that doesn't exist doesn't store anything.
            this.createTable();

            const seq = this.lastSeq() + 1;
            for (const [key, [value, updatedAt]] of Object.entries(changes)) {
                this.sql.exec(
                    `INSERT INTO entries (key, value, updated_at, seq)
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT (key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = excluded.updated_at,
                        seq = excluded.seq
                     WHERE excluded.updated_at > entries.updated_at`,
                    key,
                    value,
                    updatedAt,
                    seq
                );
            }

            if (Object.keys(changes).length > 0) {
                const [{ count }] = this.sql
                    .exec<{ count: number }>(
                        'SELECT COUNT(*) AS count FROM entries'
                    )
                    .toArray();
                // Throwing rolls the transaction back.
                if (count > MAX_ENTRIES) {
                    throw new HttpError(413, 'Too many entries');
                }
            }

            return {
                cursor: this.lastSeq(),
                changes: toData(
                    this.sql.exec<Row>(
                        'SELECT key, value, updated_at FROM entries WHERE seq > ?',
                        since
                    )
                ),
            };
        });
    }

    /**
     * Deletes everything in the list. Only a note that it was deleted is
     * kept, so devices that still sync with it stop instead of filling it
     * up again.
     */
    erase() {
        this.ctx.storage.transactionSync(() => {
            this.sql.exec('DROP TABLE IF EXISTS entries');
            this.ctx.storage.kv.put(DELETED_KEY, true);
        });
    }

    /** What others may see, for a read-only link. Friends are left out. */
    list(): ListResponse {
        if (this.tableSql() === null) return { data: {} };
        return {
            data: shareable(
                toData(
                    this.sql.exec<Row>(
                        'SELECT key, value, updated_at FROM entries WHERE value IS NOT NULL'
                    )
                )
            ),
        };
    }
}

function corsHeaders(request: Request, env: Env): HeadersInit {
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
    if (!origin || !allowed.includes(origin)) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

async function readJson(request: Request): Promise<unknown> {
    const length = Number(request.headers.get('Content-Length') ?? 0);
    if (length > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large');
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES)
        throw new HttpError(413, 'Body too large');
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        throw new HttpError(400, 'Body is not JSON');
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new HttpError(400, 'Body is not a JSON object');
    }
    return body;
}

const list = (env: Env, listId: string) =>
    env.LISTS.get(env.LISTS.idFromName(listId));

function secretOf(request: Request) {
    const secret = request.headers
        .get('Authorization')
        ?.replace(/^Bearer /, '');
    if (!isSecret(secret)) throw new HttpError(401, 'Missing secret');
    return secret;
}

/**
 * Who a rate limit counts: an IPv4 address, or an IPv6 /48, since anyone
 * with IPv6 can have up to a /48 of addresses to pick from, even for free.
 */
function clientKey(request: Request) {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (!ip.includes(':') || ip.includes('.')) return ip;
    const [head, tail] = ip.split('::');
    const before = head ? head.split(':') : [];
    const after = tail ? tail.split(':') : [];
    const groups =
        tail === undefined
            ? before
            : [
                  ...before,
                  ...Array(8 - before.length - after.length).fill('0'),
                  ...after,
              ];
    return `${groups
        .slice(0, 3)
        .map((group) => parseInt(group, 16).toString(16))
        .join(':')}::/48`;
}

/**
 * Limits pairing requests per client: getting and entering codes tightly,
 * which keeps anyone from guessing codes or holding many of them, and
 * waiting for one loosely, since waiting devices ask every few seconds.
 */
async function limitPairing(
    request: Request,
    env: Env,
    action: 'create' | 'approve' | 'wait' | 'cancel'
) {
    const limiter =
        action === 'wait' || action === 'cancel'
            ? env.PAIRING_WAIT_LIMITER
            : env.PAIRING_LIMITER;
    const { success } = await limiter.limit({
        key: `${action}:${clientKey(request)}`,
    });
    if (!success) throw new HttpError(429, 'Too many tries');
}

/** A waiting device's ticket from a request body. */
async function ticketOf(request: Request) {
    const body = (await readJson(request)) as { ticket?: unknown };
    if (!isSecret(body.ticket)) throw new HttpError(404, 'No such code');
    return body.ticket;
}

async function handle(request: Request, env: Env): Promise<unknown> {
    const { pathname } = new URL(request.url);

    if (pathname === '/v1/sync' && request.method === 'POST') {
        const secret = secretOf(request);
        const body = (await readJson(request)) as {
            since?: unknown;
            changes?: unknown;
        };
        const since =
            typeof body.since === 'number' &&
            Number.isInteger(body.since) &&
            body.since >= 0
                ? body.since
                : 0;
        return list(env, await listIdFor(secret)).sync(
            since,
            sanitize(body.changes)
        );
    }

    if (pathname === '/v1/sync' && request.method === 'DELETE') {
        await list(env, await listIdFor(secretOf(request))).erase();
        return {};
    }

    if (pathname === '/v1/pair' && request.method === 'POST') {
        await limitPairing(request, env, 'create');
        const body = (await readJson(request)) as { publicKey?: unknown };
        if (!(await canSealFor(body.publicKey))) {
            throw new HttpError(400, 'Missing public key');
        }
        const created = await pairing(env).create(
            body.publicKey as string,
            clientKey(request)
        );
        if (created === 'full') {
            throw new HttpError(503, 'Too many devices waiting');
        }
        if (created === 'held') {
            throw new HttpError(409, 'Too many codes waiting from here');
        }
        return created;
    }

    if (pathname === '/v1/pair/approve' && request.method === 'POST') {
        const secret = secretOf(request);
        await limitPairing(request, env, 'approve');
        const body = (await readJson(request)) as { code?: unknown };
        const code =
            typeof body.code === 'string' && body.code.length <= 100
                ? parsePairingCode(body.code)
                : null;
        const approved = code
            ? await pairing(env).approve(code, secret)
            : 'unknown';
        if (approved === 'unknown') throw new HttpError(404, 'No such code');
        if (approved === 'too-many') throw new HttpError(429, 'Too many tries');
        return {};
    }

    if (pathname === '/v1/pair/wait' && request.method === 'POST') {
        await limitPairing(request, env, 'wait');
        const waiting = await pairing(env).wait(await ticketOf(request));
        if (!waiting) throw new HttpError(404, 'No such code');
        return waiting;
    }

    if (pathname === '/v1/pair/cancel' && request.method === 'POST') {
        await limitPairing(request, env, 'cancel');
        await pairing(env).cancel(await ticketOf(request));
        return {};
    }

    const match = /^\/v1\/lists\/([^/]+)$/.exec(pathname);
    if (match && request.method === 'GET') {
        if (!isListId(match[1])) throw new HttpError(404, 'Not found');
        return list(env, match[1]).list();
    }

    throw new HttpError(404, 'Not found');
}

export default {
    async fetch(request, env) {
        const cors = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }
        try {
            return Response.json(await handle(request, env), {
                headers: { ...cors, 'Cache-Control': 'no-store' },
            });
        } catch (error) {
            // Errors thrown in a Durable Object lose their class on the way.
            const status =
                error instanceof HttpError
                    ? error.status
                    : /Too many entries/.test(String(error))
                      ? 413
                      : /List deleted/.test(String(error))
                        ? 410
                        : 500;
            if (status === 500) console.error(error);
            return Response.json(
                {
                    error:
                        status === 500
                            ? 'Server error'
                            : (error as Error).message,
                },
                { status, headers: cors }
            );
        }
    },
} satisfies ExportedHandler<Env>;
