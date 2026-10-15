'use client';

import { useEffect, useMemo, useState } from 'react';
import { ButtonLink } from '@/components/Button';
import { PageIntro } from '@/components/PageIntro';
import { UserLists } from '@/components/UserList';
import { liveShareLink, useSyncStatus } from '@/lib/sync';
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
    const secret = useSyncStatus()?.secret ?? null;
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
                    ? 'Your ratings and watchlist are kept in this browser and synced with your other devices.'
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
                    <SharePanel data={data} secret={secret} />
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

function SharePanel({
    data,
    secret,
}: {
    data: UserData;
    /** With sync on, the link shows the list live instead of a snapshot. */
    secret: string | null;
}) {
    const [link, setLink] = useState<string | null>(null);
    // Waits for the link, so there is something to copy when the button flashes.
    const { ref, pointedTo } = usePointedTo<HTMLElement>(
        SHARE_HASH,
        link !== null
    );

    // Kept up to date, so a snapshot link always has the latest ratings.
    useEffect(() => {
        let live = true;
        const make = secret
            ? liveShareLink(secret)
            : encodeShare(data).then(
                  (encoded) =>
                      `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH}/shared/#${encoded}`
              );
        make.then((made) => {
            if (live) setLink(made);
        });
        return () => {
            live = false;
        };
    }, [data, secret]);

    return (
        <section ref={ref} className={css.panel}>
            <h2>Share with friends</h2>
            <p>
                {secret
                    ? 'Anyone with this link can see your ratings and watchlist, always with your latest changes, and add you as a friend to compare ratings. They can’t change anything.'
                    : 'Anyone with this link can see your ratings and watchlist as they are right now. To move your list to another device, open the link there and choose Import. Turn on sync to get a link friends can compare ratings with.'}
            </p>
            <LinkField
                link={link}
                label="Link to your list"
                shareTitle="My Season-o-meter list"
                flash={pointedTo}
                onFlashed={clearHash}
            />
        </section>
    );
}
