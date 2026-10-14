'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { DoneIcon } from '@/components/Done';
import {
    connect,
    disconnect,
    syncAvailable,
    syncLink,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import { isSecret } from '@/lib/syncProtocol';
import { clearHash, useHash, usePointedTo } from '@/lib/useHash';
import { LinkField } from '../mine/LinkField';
import css from '../mine/mine.module.css';
import { CodeForm, CodeOffer } from './PairingCode';
import { QrCode } from './QrCode';

const PHASES: Record<SyncStatus['phase'], string> = {
    idle: 'Sync is on and up to date.',
    syncing: 'Sync is on. Syncing…',
    failed: 'Could not reach the sync server. Your changes are kept on this device and sync when it is back.',
    deleted: 'Your synced list has been deleted.',
};

/** How long ago `time` was, as in "Last synced 5 minutes ago". */
function ago(time: number, now: number) {
    const minutes = Math.floor((now - time) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    return new Date(time).toLocaleString('en', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/** The current time, updated often enough for `ago`. */
function useNow() {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 15_000);
        return () => clearInterval(interval);
    }, []);
    return now;
}

/** When this device last synced, kept current. */
function SyncedAt({ time }: { time: number }) {
    const now = useNow();
    return (
        <p className={css.syncedAt}>
            Last synced{' '}
            <time
                dateTime={new Date(time).toISOString()}
                title={new Date(time).toLocaleString('en', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                })}
            >
                {ago(time, Math.max(now, time))}
            </time>
        </p>
    );
}

/** The fragment that links to the sync panel, as from the Friends page. */
const SYNC_HASH = 'sync';

export function SyncPanel() {
    const status = useSyncStatus();
    /** The other way to connect a device that is showing, if any. */
    const [shown, setShown] = useState<'qr' | 'code' | null>(null);
    /** Sync was just turned on here, so the check gleams once it's done. */
    const [turnedOn, setTurnedOn] = useState(false);
    const { ref, pointedTo } = usePointedTo<HTMLElement>(
        SYNC_HASH,
        status !== null
    );
    const syncing = !!status?.secret;

    // With sync on there's no switch to point out, so the fragment can go
    // once the panel is scrolled to.
    useEffect(() => {
        if (pointedTo && syncing) clearHash();
    }, [pointedTo, syncing]);

    if (!syncAvailable || !status) return null;

    const toggle = () => {
        if (syncing) {
            setShown(null);
            setTurnedOn(false);
            disconnect();
        } else {
            setTurnedOn(true);
            connect();
        }
    };

    return (
        <section ref={ref} className={css.panel}>
            <h2>Sync your devices</h2>
            <div className={css.toggle}>
                <button
                    type="button"
                    role="switch"
                    aria-checked={syncing}
                    aria-label="Sync this device"
                    className={
                        pointedTo && !syncing
                            ? `${css.switch} ${css.flash}`
                            : css.switch
                    }
                    onClick={toggle}
                    onAnimationEnd={clearHash}
                />
                <div className={css.toggleText}>
                    <p
                        role="status"
                        data-phase={syncing ? status.phase : 'off'}
                        className={css.phase}
                    >
                        {syncing && status.phase === 'idle' && (
                            <DoneIcon
                                className={css.upToDate}
                                gleam={turnedOn}
                                onGleamEnd={() => setTurnedOn(false)}
                            />
                        )}
                        {syncing ? PHASES[status.phase] : 'Sync is off.'}
                    </p>
                    {syncing && status.syncedAt !== null && (
                        <SyncedAt time={status.syncedAt} />
                    )}
                </div>
            </div>
            {status.secret ? (
                <Connected
                    secret={status.secret}
                    shown={shown}
                    setShown={setShown}
                />
            ) : (
                <>
                    {status.phase === 'deleted' && (
                        <p className={css.problem} role="status">
                            Your synced list has been deleted, so this device
                            stopped syncing. What’s on it stays.
                        </p>
                    )}
                    <p>
                        Keep your list in step on your phone, computer and
                        tablet, with no account. Turn on sync here, then connect
                        your other devices with a private link, a QR code or a
                        short code.
                    </p>
                    <CodeOffer />
                </>
            )}
        </section>
    );
}

/** How to connect another device to the list this one syncs with. */
function Connected({
    secret,
    shown,
    setShown,
}: {
    secret: string;
    shown: 'qr' | 'code' | null;
    setShown: (shown: 'qr' | 'code' | null) => void;
}) {
    return (
        <>
            <p>
                To connect another device, open this private link on it, scan
                the QR code, or get a code on it and enter the code here. Anyone
                with the link can change your list, so keep it to yourself.
            </p>
            <LinkField
                link={syncLink(secret)}
                label="Private sync link"
                shareTitle="Season-o-meter sync link"
            />
            <div className={`${css.buttons} ${css.ways}`}>
                <Button
                    aria-pressed={shown === 'qr'}
                    onClick={() => setShown(shown === 'qr' ? null : 'qr')}
                >
                    QR code
                </Button>
                <Button
                    aria-pressed={shown === 'code'}
                    onClick={() => setShown(shown === 'code' ? null : 'code')}
                >
                    Enter a code
                </Button>
            </div>
            {shown === 'qr' && (
                <div className={css.reveal}>
                    <p>Scan it with your other device’s camera.</p>
                    <QrCode
                        value={syncLink(secret)}
                        label="QR code for the private sync link"
                    />
                </div>
            )}
            {shown === 'code' && <CodeForm secret={secret} />}
        </>
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
                <Button onClick={clearHash}>OK</Button>
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
                <Button variant="tonal" onClick={() => connect(secret)}>
                    Connect
                </Button>
                <Button onClick={clearHash}>Not now</Button>
            </div>
        </section>
    );
}
