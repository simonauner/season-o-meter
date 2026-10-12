'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { UserLists } from '@/components/UserList';
import { fromImdbExport } from '@/lib/imdbImport';
import type { SearchEntry } from '@/lib/searchIndex';
import { encodeShare, type UserData } from '@/lib/userData';
import { listItems } from '@/lib/userList';
import { importData, useUserData } from '@/lib/userStore';
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
                <UserLists items={items} owner="Your" />
            )}

            <div className={css.panels}>
                {data && items && items.length > 0 && (
                    <SharePanel data={data} />
                )}
                <ImdbPanel index={index} />
            </div>
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

function ImdbPanel({ index }: { index: SearchEntry[] | null }) {
    const [result, setResult] = useState<string | null>(null);

    const known = useMemo(
        () =>
            index && {
                series: new Set(
                    index
                        .filter((entry) => entry.type === 'series')
                        .map((entry) => entry.id)
                ),
                movies: new Set(index.flatMap((entry) => entry.movieIds ?? [])),
            },
        [index]
    );

    const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.target;
        if (!known || !input.files) return;
        let total = 0;
        let matched = 0;
        let changed = 0;
        const unreadable: string[] = [];
        for (const file of input.files) {
            const parsed = fromImdbExport(await file.text(), known);
            if (!parsed) {
                unreadable.push(file.name);
                continue;
            }
            total += parsed.total;
            matched += parsed.matched;
            changed += importData(parsed.data);
        }
        input.value = '';
        setResult(
            [
                total > 0 &&
                    `Read ${total} titles, of which ${matched} are on Season-o-meter. ${changed} ratings and watchlist entries were added or updated.`,
                unreadable.length > 0 &&
                    `${unreadable.join(', ')} doesn't look like an IMDb ratings or watchlist export.`,
            ]
                .filter(Boolean)
                .join(' ')
        );
    };

    return (
        <section className={css.panel}>
            <h2>Import from IMDb</h2>
            <p>
                IMDb doesn&apos;t let other sites read your ratings, but you can
                export them. On IMDb, open Your Ratings or your Watchlist,
                choose Export, and download the CSV file from your Exports page.
                Then pick it here. Seasons can&apos;t be imported, since IMDb
                rates episodes rather than seasons.
            </p>
            <label className={css.button}>
                Choose CSV files…
                <input
                    type="file"
                    accept=".csv,text/csv"
                    multiple
                    className="visually-hidden"
                    disabled={!known}
                    onChange={onChange}
                />
            </label>
            {result && (
                <p className={css.result} role="status">
                    {result}
                </p>
            )}
        </section>
    );
}
