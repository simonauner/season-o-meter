'use client';

import { useEffect, useMemo, useState } from 'react';
import { ButtonLink } from '@/components/Button';
import { PageIntro } from '@/components/PageIntro';
import { Reveal } from '@/components/Reveal';
import { UserLists } from '@/components/UserList';
import { useSyncStatus } from '@/lib/sync';
import { listItems } from '@/lib/userList';
import { useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import css from './mine.module.css';
import { SHARE_HASH, SharePanel } from './SharePanel';
import { ConnectPrompt } from '../profile/SyncPanel';

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

    // Hidden until hydrated, since what's shown depends on this browser, and
    // the list then slides in instead of replacing the page's loading state.
    return (
        <Reveal>
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
                // Keeps the footer out of view until the list is there.
                <div className={css.loading}>
                    <p className={css.status}>Loading…</p>
                </div>
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
        </Reveal>
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
