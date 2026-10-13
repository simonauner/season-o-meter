'use client';

import { useState, type FormEvent } from 'react';
import { recoveryKey, secretFromInput } from '@/lib/recoveryKey';
import {
    connect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import mineCss from '../mine/mine.module.css';
import css from './profile.module.css';

const profilePage = () =>
    `${location.host}${process.env.NEXT_PUBLIC_BASE_PATH}/profile/`;

/** Opens the visitor's mail app with the key, addressed to nobody yet. */
function mailLink(secret: string) {
    const body = [
        `Your Season-o-meter recovery key: ${recoveryKey(secret)}`,
        '',
        'To get your ratings, watchlist and friends back in another browser, open this link:',
        syncLink(secret),
        '',
        `Or go to ${profilePage()} and enter the key.`,
        '',
        'Anyone with the key or the link can see and change your list, so keep them to yourself.',
    ].join('\n');
    return `mailto:?subject=${encodeURIComponent(
        'Your Season-o-meter recovery key'
    )}&body=${encodeURIComponent(body)}`;
}

/**
 * A synced list's secret as a recovery key, to write down or email, and a
 * form that brings a list back from one.
 */
export function RecoveryPanel() {
    const status = useSyncStatus();
    if (!syncAvailable || !status) return null;

    return (
        <section className={mineCss.panel}>
            <h2>Recovery key</h2>
            {status.secret ? (
                <KeyShown secret={status.secret} />
            ) : (
                <>
                    <p>
                        A recovery key gets your ratings, watchlist and friends
                        back in another browser, or in this one if it forgets
                        them. Creating one turns on sync, which keeps a copy of
                        your list on the sync server.
                    </p>
                    <button
                        type="button"
                        className={mineCss.button}
                        onClick={() => connect()}
                    >
                        Create a recovery key
                    </button>
                </>
            )}
            <KeyForm status={status} />
        </section>
    );
}

function KeyShown({ secret }: { secret: string }) {
    const key = recoveryKey(secret);
    const [copied, setCopied] = useState<string | null>(null);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(key);
            setCopied(key);
        } catch {
            // The key is still there to copy by hand.
        }
    };

    return (
        <>
            <p>
                This key gets your ratings, watchlist and friends back in
                another browser, or in this one if it forgets them. Write it
                down or email it to yourself. Keep it like a password: anyone
                with it can see and change your list.
            </p>
            <output className={`${mineCss.code} ${css.key}`}>{key}</output>
            <div className={`${mineCss.buttons} ${css.keyButtons}`}>
                <button type="button" className={mineCss.button} onClick={copy}>
                    {copied === key ? 'Copied' : 'Copy key'}
                </button>
                <a href={mailLink(secret)} className={mineCss.secondary}>
                    Email it to me
                </a>
            </div>
        </>
    );
}

type Result = 'invalid' | 'same' | 'restored';

function KeyForm({ status }: { status: SyncStatus }) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const secret = secretFromInput(input);
        if (!secret || secret === status.secret) {
            setResult(secret ? 'same' : 'invalid');
            return;
        }
        setBusy(true);
        setResult(null);
        await connect(secret);
        setInput('');
        setResult('restored');
        setBusy(false);
    };

    // How restoring went shows in the sync status, which stays up to date.
    const message =
        result === 'invalid'
            ? 'That isn’t a recovery key. Check it for typos.'
            : result === 'same'
              ? 'This browser already uses that key.'
              : result === 'restored' && status.phase === 'deleted'
                ? 'The list for that key has been deleted.'
                : result === 'restored' && status.phase === 'failed'
                  ? 'Could not reach the sync server. Your list comes back here once it can.'
                  : result === 'restored'
                    ? 'Your list is back in this browser.'
                    : null;
    const good = result === 'restored' && status.phase !== 'deleted';

    return (
        <form className={css.keyForm} onSubmit={submit}>
            <label htmlFor="recovery-key" className={mineCss.label}>
                Have a recovery key from before? Enter it to get your list back
                here.
                {status.secret &&
                    ' This browser then stops syncing with its current list, so save its key first.'}
            </label>
            <div className={mineCss.linkRow}>
                <input
                    id="recovery-key"
                    className={mineCss.link}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="XXXX-XXXX-…"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    aria-describedby={message ? 'recovery-result' : undefined}
                />
                <button
                    type="submit"
                    className={mineCss.button}
                    disabled={busy || !input.trim()}
                >
                    {busy ? 'Restoring…' : 'Restore'}
                </button>
            </div>
            {message && (
                <p
                    id="recovery-result"
                    role={good ? 'status' : 'alert'}
                    className={good ? mineCss.success : mineCss.problem}
                >
                    {message}
                </p>
            )}
        </form>
    );
}
