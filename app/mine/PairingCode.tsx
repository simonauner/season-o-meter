'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { parsePairingCode } from '@/lib/pairingCode';
import {
    approvePairing,
    checkPairing,
    startPairing,
    type ApproveResult,
    type Pairing,
} from '@/lib/sync';
import css from './mine.module.css';

const EXAMPLE = 'brave-otter';

/** How often a waiting device asks whether its code has been entered. */
const CHECK_INTERVAL_MS = 2000;

const minutesAndSeconds = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const minePage = () =>
    `${location.host}${process.env.NEXT_PUBLIC_BASE_PATH}/mine/`;

type Offer =
    | { phase: 'idle' | 'loading' | 'failed' | 'expired' }
    | { phase: 'waiting'; pairing: Pairing };

/**
 * On a device that doesn't sync: shows a pairing code to enter on a device
 * that does, and connects to its list once someone has.
 */
export function CodeOffer() {
    const [offer, setOffer] = useState<Offer>({ phase: 'idle' });
    const [now, setNow] = useState(() => Date.now());
    const pairing = offer.phase === 'waiting' ? offer.pairing : null;

    const start = async () => {
        setOffer({ phase: 'loading' });
        try {
            const started = await startPairing();
            setNow(Date.now());
            setOffer({ phase: 'waiting', pairing: started });
        } catch {
            setOffer({ phase: 'failed' });
        }
    };

    useEffect(() => {
        if (!pairing) return;
        let live = true;
        let checking = false;
        const check = async () => {
            if (checking || document.visibilityState !== 'visible') return;
            checking = true;
            try {
                // When it connects, the panel switches to showing that sync
                // is on, so only expiry needs handling here.
                const result = await checkPairing(pairing);
                if (live && result === 'expired') {
                    setOffer({ phase: 'expired' });
                }
            } catch {
                // Tried again on the next tick.
            } finally {
                checking = false;
            }
        };
        const timer = setInterval(check, CHECK_INTERVAL_MS);
        const clock = setInterval(() => setNow(Date.now()), 1000);
        document.addEventListener('visibilitychange', check);
        return () => {
            live = false;
            clearInterval(timer);
            clearInterval(clock);
            document.removeEventListener('visibilitychange', check);
        };
    }, [pairing]);

    if (offer.phase === 'idle' || offer.phase === 'loading') {
        return (
            <div className={css.codeForm}>
                <p>
                    Already syncing on another device? Get a code here and enter
                    it there.
                </p>
                <button
                    type="button"
                    className={css.secondary}
                    onClick={start}
                    disabled={offer.phase === 'loading'}
                >
                    {offer.phase === 'loading'
                        ? 'Getting a code…'
                        : 'Get a code'}
                </button>
            </div>
        );
    }

    if (!pairing) {
        return (
            <div className={css.codeForm}>
                <p>
                    {offer.phase === 'failed'
                        ? 'Could not reach the sync server.'
                        : 'The code has expired.'}
                </p>
                <button type="button" className={css.secondary} onClick={start}>
                    Get a new code
                </button>
            </div>
        );
    }

    const left = pairing.expiresAt - now;

    return (
        <div className={css.codeForm}>
            <p>
                On the device that syncs, go to <strong>{minePage()}</strong>,
                choose <em>Enter a code</em> and type:
            </p>
            <output className={css.code} aria-label="Pairing code">
                {pairing.code}
            </output>
            <p className={css.expiry} role="status">
                {left > 0
                    ? `Waiting for the code to be entered. Expires in ${minutesAndSeconds(left)}.`
                    : 'Expiring…'}
            </p>
            <p className={css.expiry}>
                What you have rated on this device is then added to the list.
            </p>
            <button
                type="button"
                className={css.secondary}
                onClick={() => setOffer({ phase: 'idle' })}
            >
                Cancel
            </button>
        </div>
    );
}

const MESSAGES: Record<ApproveResult | 'invalid', string> = {
    approved: 'Done. The other device connects in a moment.',
    invalid: `A code is two words, like ${EXAMPLE}.`,
    unknown:
        'No device is waiting with that code. Check it, or get a new one on the other device.',
    'too-many': 'Too many tries. Wait a minute and try again.',
    failed: 'Could not reach the sync server. Try again in a moment.',
};

/** On a device that syncs: connects the device showing a pairing code. */
export function CodeForm({ secret }: { secret: string }) {
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<keyof typeof MESSAGES | null>(null);

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const code = parsePairingCode(input);
        if (!code) {
            setResult('invalid');
            return;
        }
        setBusy(true);
        setResult(null);
        const approved = await approvePairing(secret, code);
        setResult(approved);
        if (approved === 'approved') setInput('');
        setBusy(false);
    };

    return (
        <form className={css.reveal} onSubmit={submit}>
            <label htmlFor="pairing-code" className={css.label}>
                On the other device, go to <strong>{minePage()}</strong> and
                choose <em>Get a code</em>. Then enter the code here.
            </label>
            <div className={css.linkRow}>
                <input
                    id="pairing-code"
                    className={css.link}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={EXAMPLE}
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    aria-describedby={result ? 'pairing-result' : undefined}
                />
                <button type="submit" className={css.button} disabled={busy}>
                    {busy ? 'Connecting…' : 'Connect'}
                </button>
            </div>
            {result && (
                <p
                    id="pairing-result"
                    role={result === 'approved' ? 'status' : 'alert'}
                    className={
                        result === 'approved' ? css.success : css.problem
                    }
                >
                    {MESSAGES[result]}
                </p>
            )}
        </form>
    );
}
