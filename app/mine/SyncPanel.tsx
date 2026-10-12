'use client';

import { useEffect } from 'react';
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

const PHASES: Record<SyncStatus['phase'], string> = {
    idle: 'Up to date.',
    syncing: 'Syncing…',
    failed: 'Could not reach the sync server. Your changes are kept on this device and sync when it is back.',
};

export function SyncPanel() {
    const status = useSyncStatus();
    if (!syncAvailable || !status) return null;

    if (!status.secret) {
        return (
            <section className={css.panel}>
                <h2>Sync your devices</h2>
                <p>
                    Keep your list in step on your phone, computer and tablet,
                    with no account. You get a private link to open on your
                    other devices.
                </p>
                <button
                    type="button"
                    className={css.button}
                    onClick={() => connect()}
                >
                    Turn on sync
                </button>
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
                Open this private link on your other devices to connect them.
                Anyone with it can change your list, so keep it to yourself.
            </p>
            <LinkField
                link={syncLink(status.secret)}
                label="Private sync link"
                shareTitle="Season-o-meter sync link"
            />
            <button
                type="button"
                className={css.secondary}
                onClick={disconnect}
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
