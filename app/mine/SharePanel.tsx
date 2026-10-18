'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { ChoicePicker } from '@/components/ChoicePicker';
import {
    connect,
    liveShareLink,
    syncAvailable,
    type SyncStatus,
} from '@/lib/sync';
import { encodeShare, type UserData } from '@/lib/userData';
import { clearHash, usePointedTo } from '@/lib/useHash';
import { LinkField } from './LinkField';
import css from './mine.module.css';

/** The fragment that links to the share panel, as from the Friends page. */
export const SHARE_HASH = 'share';

type ShareKind = 'live' | 'snapshot';

const SHARE_KINDS = [
    { value: 'live', label: 'Live link' },
    { value: 'snapshot', label: 'Snapshot' },
] as const;

export function SharePanel({
    data,
    secret,
    phase,
    liveOnly = false,
}: {
    data: UserData;
    /** Null while the list isn't on the sync server, so there's no live link. */
    secret: string | null;
    phase: SyncStatus['phase'] | null;
    /** Offers only the live link, without the choice of a snapshot. */
    liveOnly?: boolean;
}) {
    // Without the sync server there are only snapshots.
    const [chosen, setChosen] = useState<ShareKind>('live');
    const kind = liveOnly ? 'live' : syncAvailable ? chosen : 'snapshot';
    const [snapshot, setSnapshot] = useState<string | null>(null);
    const [made, setMade] = useState<{ secret: string; link: string } | null>(
        null
    );
    const live = secret && made?.secret === secret ? made.link : null;
    // Waits for something to point out: the link, or the button that makes one.
    const { ref, pointedTo } = usePointedTo<HTMLElement>(
        SHARE_HASH,
        kind === 'snapshot' ? snapshot !== null : !secret || live !== null
    );

    // Kept up to date, so a snapshot link always has the latest ratings.
    useEffect(() => {
        if (liveOnly) return;
        let current = true;
        encodeShare(data).then((encoded) => {
            if (current) {
                setSnapshot(
                    `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH}/shared/#${encoded}`
                );
            }
        });
        return () => {
            current = false;
        };
    }, [data, liveOnly]);

    useEffect(() => {
        if (!secret) return;
        let current = true;
        liveShareLink(secret).then((link) => {
            if (current) setMade({ secret, link });
        });
        return () => {
            current = false;
        };
    }, [secret]);

    return (
        <section ref={ref} className={css.panel}>
            <h2>Share your list</h2>
            {syncAvailable && !liveOnly && (
                <div className={css.kinds}>
                    <ChoicePicker
                        label="Share"
                        options={SHARE_KINDS}
                        current={kind}
                        onChange={setChosen}
                    />
                </div>
            )}
            {kind === 'snapshot' ? (
                <>
                    <p>
                        Anyone with this link can see your ratings and watchlist
                        as they are right now. Later changes don’t show up. To
                        move your list to another device, open the link there
                        and choose Import.
                    </p>
                    <LinkField
                        link={snapshot}
                        label="Snapshot of your list"
                        shareTitle="My Season-o-meter list"
                        flash={pointedTo}
                        onFlashed={clearHash}
                    />
                </>
            ) : secret ? (
                <>
                    <p>
                        Anyone with this link can follow your ratings and
                        watchlist, always with your latest changes, and add you
                        as a friend to compare ratings. They can’t change
                        anything.
                    </p>
                    <LinkField
                        link={live}
                        label="Live link to your list"
                        shareTitle="My Season-o-meter list"
                        flash={pointedTo}
                        onFlashed={clearHash}
                    />
                    {phase === 'failed' && (
                        <p className={css.problem} role="status">
                            Could not reach the sync server. The link shows your
                            latest changes once it’s back.
                        </p>
                    )}
                </>
            ) : (
                <>
                    <p>
                        A live link lets friends follow your ratings and
                        watchlist, always with your latest changes, and add you
                        as a friend to compare ratings. They can’t change
                        anything. For that, your list is kept on the sync server
                        too, which also lets you sync it with your other devices
                        on your <Link href="/profile/">Profile</Link>.
                    </p>
                    <Button
                        className={pointedTo ? css.flash : undefined}
                        onClick={() => connect()}
                        onAnimationEnd={clearHash}
                    >
                        Create a live link
                    </Button>
                </>
            )}
        </section>
    );
}
