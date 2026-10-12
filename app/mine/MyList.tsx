'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { UserList } from '@/components/UserList';
import { encodeShare, type UserData } from '@/lib/userData';
import { listItems, rated, watchlist } from '@/lib/userList';
import { useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import css from './mine.module.css';

export function MyList() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const items = useMemo(
        () => (data && index ? listItems(data, index) : null),
        [data, index]
    );

    return (
        <>
            <PageIntro title="My list">
                Your ratings and watchlist are kept in this browser. Nothing
                leaves it unless you share a link.
            </PageIntro>

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
                <>
                    <UserList
                        title="Watchlist"
                        items={watchlist(items)}
                        owner="Your"
                    />
                    <UserList title="Rated" items={rated(items)} owner="Your" />
                </>
            )}

            {data && items && items.length > 0 && (
                <div className={css.panels}>
                    <SharePanel data={data} />
                </div>
            )}
        </>
    );
}

function SharePanel({ data }: { data: UserData }) {
    const [link, setLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Kept up to date, so the link always has the latest ratings.
    useEffect(() => {
        let live = true;
        encodeShare(data).then((encoded) => {
            if (!live) return;
            setLink(
                `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH}/shared/#${encoded}`
            );
            setCopied(false);
        });
        return () => {
            live = false;
        };
    }, [data]);

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
        } catch {
            // The link is still there to copy by hand.
        }
    };

    return (
        <section className={css.panel}>
            <h2>Share or move your list</h2>
            <p>
                Anyone with this link can see your ratings and watchlist as they
                are right now. To move your list to another device, open the
                link there and choose Import.
            </p>
            <div className={css.linkRow}>
                <input
                    className={css.link}
                    readOnly
                    value={link ?? ''}
                    aria-label="Link to your list"
                    onFocus={(event) => event.target.select()}
                />
                <button
                    type="button"
                    className={css.button}
                    onClick={copy}
                    disabled={!link}
                >
                    {copied ? 'Copied' : 'Copy link'}
                </button>
                {link && 'share' in navigator && (
                    <button
                        type="button"
                        className={css.button}
                        onClick={() =>
                            navigator
                                .share({
                                    title: 'My Season-o-meter list',
                                    url: link,
                                })
                                .catch(() => {})
                        }
                    >
                        Share…
                    </button>
                )}
            </div>
        </section>
    );
}
