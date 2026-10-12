'use client';

import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { UserList } from '@/components/UserList';
import { fromImdbExport } from '@/lib/imdbImport';
import type { SearchEntry } from '@/lib/searchIndex';
import { encodeShare, type UserData } from '@/lib/userData';
import { listItems, rated, watchlist } from '@/lib/userList';
import { liveShareLink, useSyncStatus } from '@/lib/sync';
import { importData, useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import { LinkField } from './LinkField';
import css from './mine.module.css';
import { ConnectPrompt, SyncPanel } from './SyncPanel';

export function MyList() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const secret = useSyncStatus()?.secret ?? null;
    const items = useMemo(
        () => (data && index ? listItems(data, index) : null),
        [data, index]
    );

    return (
        <>
            <PageIntro title="My list">
                {secret
                    ? 'Your ratings and watchlist are kept in this browser and synced with your other devices.'
                    : 'Your ratings and watchlist are kept in this browser. Nothing leaves it unless you share a link or turn on sync.'}
            </PageIntro>

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
                <>
                    <UserList
                        title="Watchlist"
                        items={watchlist(items)}
                        owner="Your"
                    />
                    <UserList title="Rated" items={rated(items)} owner="Your" />
                </>
            )}

            <div className={css.panels}>
                <SyncPanel />
                {data && items && items.length > 0 && (
                    <SharePanel data={data} secret={secret} />
                )}
                <ImdbPanel index={index} />
            </div>
        </>
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
        <section className={css.panel}>
            <h2>Share your list</h2>
            <p>
                {secret
                    ? 'Anyone with this link can see your ratings and watchlist, always with your latest changes. They can’t change anything.'
                    : 'Anyone with this link can see your ratings and watchlist as they are right now. To move your list to another device, open the link there and choose Import.'}
            </p>
            <LinkField
                link={link}
                label="Link to your list"
                shareTitle="My Season-o-meter list"
            />
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
