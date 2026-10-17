'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { ChoicePicker } from '@/components/ChoicePicker';
import { PageIntro } from '@/components/PageIntro';
import { UserLists } from '@/components/UserList';
import {
    connect,
    liveShareLink,
    syncAvailable,
    useSyncStatus,
    type SyncStatus,
} from '@/lib/sync';
import { encodeShare, type UserData } from '@/lib/userData';
import { listItems } from '@/lib/userList';
import { useUserData } from '@/lib/userStore';
import { clearHash, usePointedTo } from '@/lib/useHash';
import { useSearchIndex } from '@/lib/useSearchIndex';
import { LinkField } from './LinkField';
import css from './mine.module.css';
import { ConnectPrompt } from '../profile/SyncPanel';

/** The fragment that links to the share panel, as from the Friends page. */
const SHARE_HASH = 'share';

export function MyList() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const sync = useSyncStatus();
    const secret = sync?.secret ?? null;
    const items = useMemo(
        () => (data && index ? listItems(data, index) : null),
        [data, index]
    );
    const [panels, setPanels] = useState<HTMLDivElement | null>(null);
    const shareInView = useInView(panels);

    return (
        <>
            <PageIntro
                title="My list"
                action={panels && shareInView === false && <ShareJump />}
            >
                {secret
                    ? 'Your ratings and watchlist are kept in this browser and on the sync server, for your live link and your other devices.'
                    : 'Your ratings and watchlist are kept in this browser. Nothing leaves it unless you share a link or turn on sync.'}
            </PageIntro>

            {/* Sync links used to open My list, so ones from before still work. */}
            <ConnectPrompt />

            {failed ? (
                <p className={css.status}>Could not load your list.</p>
            ) : !items ? (
                <p className={css.status}>Loading…</p>
            ) : items.length === 0 ? (
                <p className={css.status}>
                    Nothing here yet. Rate a series or film series, or its
                    seasons and movies, or add it to your watchlist on its page.
                </p>
            ) : (
                <UserLists items={items} owner="Your" />
            )}

            {data && items && items.length > 0 && (
                <div ref={setPanels} className={css.panels}>
                    <SharePanel
                        data={data}
                        secret={secret}
                        phase={sync?.phase ?? null}
                    />
                </div>
            )}
        </>
    );
}

/** Whether an element is at least partly on screen, or null until known. */
function useInView(element: Element | null) {
    const [inView, setInView] = useState<boolean | null>(null);

    useEffect(() => {
        if (!element) return;
        const observer = new IntersectionObserver(([entry]) =>
            setInView(entry.isIntersecting)
        );
        observer.observe(element);
        return () => {
            observer.disconnect();
            setInView(null);
        };
    }, [element]);

    return inView;
}

/** Takes a long list down to the share panel, which then points out its button. */
function ShareJump() {
    return (
        <ButtonLink
            href={`#${SHARE_HASH}`}
            size="small"
            className={css.jump}
            onClick={(event) => {
                event.preventDefault();
                // The panel clears the fragment again, so leave no history entry.
                location.replace(`#${SHARE_HASH}`);
            }}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
                <path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H16" />
            </svg>
            Share
        </ButtonLink>
    );
}

type ShareKind = 'live' | 'snapshot';

const SHARE_KINDS = [
    { value: 'live', label: 'Live link' },
    { value: 'snapshot', label: 'Snapshot' },
] as const;

function SharePanel({
    data,
    secret,
    phase,
}: {
    data: UserData;
    /** Null while the list isn't on the sync server, so there's no live link. */
    secret: string | null;
    phase: SyncStatus['phase'] | null;
}) {
    // Without the sync server there are only snapshots.
    const [chosen, setChosen] = useState<ShareKind>('live');
    const kind = syncAvailable ? chosen : 'snapshot';
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
    }, [data]);

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
            {syncAvailable && (
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
