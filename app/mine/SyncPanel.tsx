'use client';

import { useEffect, useState } from 'react';
import {
    connect,
    disconnect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import { isSecret } from '@/lib/syncProtocol';
import { clearHash, useHash } from '@/lib/useHash';
import { LinkField } from './LinkField';
import css from './mine.module.css';
import { CodeForm, CodeOffer } from './PairingCode';
import { QrCode } from './QrCode';

const PHASES: Record<SyncStatus['phase'], string> = {
    idle: 'Up to date.',
    syncing: 'Syncing…',
    failed: 'Could not reach the sync server. Your changes are kept on this device and sync when it is back.',
};

export function SyncPanel() {
    const status = useSyncStatus();
    /** The other way to connect a device that is showing, if any. */
    const [shown, setShown] = useState<'qr' | 'code' | null>(null);
    if (!syncAvailable || !status) return null;

    if (!status.secret) {
        return (
            <section className={css.panel}>
                <h2>Sync your devices</h2>
                <p>
                    Keep your list in step on your phone, computer and tablet,
                    with no account. Turn on sync here, then connect your other
                    devices with a private link, a QR code or a short code.
                </p>
                <button
                    type="button"
                    className={css.button}
                    onClick={() => connect()}
                >
                    Turn on sync
                </button>
                <CodeOffer />
            </section>
        );
    }

    return (
        <section className={css.panel}>
            <h2>Sync is on</h2>
            <p role="status" data-phase={status.phase} className={css.phase}>
                {PHASES[status.phase]}
            </p>
            <p>
                To connect another device, open this private link on it, scan
                the QR code, or get a code on it and enter the code here. Anyone
                with the link can change your list, so keep it to yourself.
            </p>
            <LinkField
                link={syncLink(status.secret)}
                label="Private sync link"
                shareTitle="Season-o-meter sync link"
            />
            <div className={`${css.buttons} ${css.ways}`}>
                <button
                    type="button"
                    className={css.secondary}
                    aria-pressed={shown === 'qr'}
                    onClick={() => setShown(shown === 'qr' ? null : 'qr')}
                >
                    QR code
                </button>
                <button
                    type="button"
                    className={css.secondary}
                    aria-pressed={shown === 'code'}
                    onClick={() => setShown(shown === 'code' ? null : 'code')}
                >
                    Enter a code
                </button>
            </div>
            {shown === 'qr' && (
                <div className={css.reveal}>
                    <p>Scan it with your other device’s camera.</p>
                    <QrCode
                        value={syncLink(status.secret)}
                        label="QR code for the private sync link"
                    />
                </div>
            )}
            {shown === 'code' && <CodeForm secret={status.secret} />}
            <button
                type="button"
                className={`${css.secondary} ${css.stop}`}
                onClick={() => {
                    setShown(null);
                    disconnect();
                }}
            >
                Stop syncing on this device
            </button>
        </section>
    );
}

const SYNC_PREFIX = 'sync=';

/** Shown when a sync link from another device is opened. */
export function ConnectPrompt() {
    const hash = useHash();
    const status = useSyncStatus();
    const secret = hash?.startsWith(SYNC_PREFIX)
        ? hash.slice(SYNC_PREFIX.length)
        : null;
    const alreadyConnected = secret !== null && status?.secret === secret;

    // Keeps the secret out of the address bar once it has done its job.
    useEffect(() => {
        if (alreadyConnected) clearHash();
    }, [alreadyConnected]);

    if (!syncAvailable || !status || secret === null || alreadyConnected) {
        return null;
    }

    if (!isSecret(secret)) {
        return (
            <section className={`${css.panel} ${css.prompt}`}>
                <h2>This sync link doesn&apos;t work</h2>
                <p>Check that the whole link was copied.</p>
                <button
                    type="button"
                    className={css.secondary}
                    onClick={clearHash}
                >
                    OK
                </button>
            </section>
        );
    }

    return (
        <section className={`${css.panel} ${css.prompt}`}>
            <h2>Connect this device?</h2>
            <p>
                This link connects this device to a synced list. What you have
                rated here is added to it, and from then on changes show up on
                every connected device.
                {status.secret &&
                    ' This device stops syncing with the list it syncs with now.'}
            </p>
            <div className={css.buttons}>
                <button
                    type="button"
                    className={css.button}
                    onClick={() => connect(secret)}
                >
                    Connect
                </button>
                <button
                    type="button"
                    className={css.secondary}
                    onClick={clearHash}
                >
                    Not now
                </button>
            </div>
        </section>
    );
}
