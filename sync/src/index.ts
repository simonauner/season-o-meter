/**
 * Sync server for Season-o-meter. One Durable Object per synced list holds
 * its ratings and watchlist in SQLite, and merges changes from devices with
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
import { sanitize, type UserData } from '../../lib/userData';
import { parsePairingCode } from '../../lib/pairingCode';
import { canSealFor, pairing } from './pairing';

export { Pairing } from './pairing';

/** Far more than anyone rates, but keeps a list from growing without bound. */
const MAX_ENTRIES = 50_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message);
    }
}

type Row = { key: string; value: number | null; updated_at: number };

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

    private hasTable() {
        return (
            this.sql
                .exec(
                    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'entries'"
                )
                .toArray().length > 0
        );
    }

    /** Merges a device's changes and returns what changed since `since`. */
    sync(since: number, changes: UserData): SyncResponse {
        return this.ctx.storage.transactionSync(() => {
            // Tables are only created on the first write, so reading a list
            // that doesn't exist doesn't store anything.
            this.sql.exec(`
                CREATE TABLE IF NOT EXISTS entries (
                    key TEXT PRIMARY KEY,
                    value INTEGER,
                    updated_at INTEGER NOT NULL,
                    -- Bumped on every write, so devices can ask for what's new.
                    seq INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS entries_seq ON entries (seq);
            `);

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

    /** Everything that is set, for a read-only link. */
    list(): ListResponse {
        if (!this.hasTable()) return { data: {} };
        return {
            data: toData(
                this.sql.exec<Row>(
                    'SELECT key, value, updated_at FROM entries WHERE value IS NOT NULL'
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    try {
        return JSON.parse(text);
    } catch {
        throw new HttpError(400, 'Body is not JSON');
    }
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
 * Who a rate limit counts: an IPv4 address, or an IPv6 /64, since anyone
 * with IPv6 usually has a whole /64 of addresses to pick from.
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
        .slice(0, 4)
        .map((group) => parseInt(group, 16).toString(16))
        .join(':')}::/64`;
}

/**
 * Limits pairing requests per client, which keeps anyone from guessing
 * codes or holding many of them.
 */
async function limitPairing(request: Request, env: Env, action: string) {
    const { success } = await env.PAIRING_LIMITER.limit({
        key: `${action}:${clientKey(request)}`,
    });
    if (!success) throw new HttpError(429, 'Too many tries');
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

    if (pathname === '/v1/pair' && request.method === 'POST') {
        await limitPairing(request, env, 'create');
        const body = (await readJson(request)) as { publicKey?: unknown };
        if (!(await canSealFor(body.publicKey))) {
            throw new HttpError(400, 'Missing public key');
        }
        const created = await pairing(env).create(body.publicKey as string);
        if (!created) throw new HttpError(503, 'Too many devices waiting');
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
        if (!code || !(await pairing(env).approve(code, secret))) {
            throw new HttpError(404, 'No such code');
        }
        return {};
    }

    if (pathname === '/v1/pair/wait' && request.method === 'POST') {
        const body = (await readJson(request)) as { ticket?: unknown };
        const waiting = isSecret(body.ticket)
            ? await pairing(env).wait(body.ticket)
            : null;
        if (!waiting) throw new HttpError(404, 'No such code');
        return waiting;
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
