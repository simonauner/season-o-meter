'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { heroVisibility } from '@/components/Hero';
import { PageIntro } from '@/components/PageIntro';
import { friendsOf } from '@/lib/friends';
import type { Kind } from '@/lib/minCount';
import type { SearchEntry } from '@/lib/searchIndex';
import { entryHref } from '@/lib/swipeDeck';
import { syncAvailable, useSyncStatus } from '@/lib/sync';
import { resetTips, useSeenTipCount } from '@/lib/tips';
import { flaggedIds, skipKey, type UserData } from '@/lib/userData';
import { listItems, rated, watchlist } from '@/lib/userList';
import { setValue, setValues, useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import mineCss from '../mine/mine.module.css';
import css from './profile.module.css';

const count = (n: number, noun: string) =>
    `${n.toLocaleString('en')} ${noun}${n === 1 ? '' : 's'}`;

export function Profile() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const secret = useSyncStatus()?.secret ?? null;

    return (
        <>
            <PageIntro title="Profile">
                {secret
                    ? 'Everything here is kept in this browser and synced with your other devices.'
                    : 'Everything here is kept in this browser.'}
            </PageIntro>

            {failed ? (
                <p className={mineCss.status}>Could not load your profile.</p>
            ) : !data || !index ? (
                <p className={mineCss.status}>Loading…</p>
            ) : (
                <div className={`${mineCss.panels} ${css.panels}`}>
                    <SkippedPanel data={data} index={index} />
                    <OverviewPanel
                        data={data}
                        index={index}
                        syncing={secret !== null}
                    />
                    <HeroPanel kind="series" />
                    <HeroPanel kind="movies" />
                    <TipsPanel />
                </div>
            )}
        </>
    );
}

function SkippedPanel({
    data,
    index,
}: {
    data: UserData;
    index: SearchEntry[];
}) {
    const [broughtBack, setBroughtBack] = useState<number | null>(null);
    const skipped = useMemo(() => flaggedIds(data, 's:'), [data]);

    // Most recently skipped first.
    const entries = useMemo(() => {
        const byId = new Map(index.map((entry) => [entry.id, entry]));
        return [...skipped]
            .sort((a, b) => data[skipKey(b)][1] - data[skipKey(a)][1])
            .flatMap((id) => byId.get(id) ?? []);
    }, [data, index, skipped]);

    const bringAllBack = () => {
        setValues(
            Object.fromEntries([...skipped].map((id) => [skipKey(id), null]))
        );
        setBroughtBack(skipped.size);
    };

    return (
        <section className={mineCss.panel}>
            <h2>Skipped in Swipe</h2>
            {skipped.size === 0 ? (
                <p>
                    Nothing skipped. What you skip in{' '}
                    <Link href="/swipe/" className={css.link}>
                        Swipe
                    </Link>{' '}
                    doesn’t come up there again, until you bring it back here.
                </p>
            ) : (
                <>
                    <p>
                        You’ve skipped{' '}
                        {skipped.size === 1
                            ? 'one title'
                            : `${skipped.size.toLocaleString('en')} series and film series`}
                        . They don’t come up in Swipe again until you bring them
                        back.
                    </p>
                    <button
                        type="button"
                        className={mineCss.button}
                        onClick={bringAllBack}
                    >
                        Bring them all back
                    </button>
                    {entries.length > 0 && <SkippedList entries={entries} />}
                </>
            )}
            {broughtBack !== null && skipped.size === 0 && (
                <p className={mineCss.success} role="status">
                    Brought back {count(broughtBack, 'title')}. They’re back in{' '}
                    <Link href="/swipe/" className={css.link}>
                        Swipe
                    </Link>
                    .
                </p>
            )}
        </section>
    );
}

function SkippedList({ entries }: { entries: SearchEntry[] }) {
    return (
        <details className={css.details}>
            <summary>See what you skipped</summary>
            <ul className={css.list}>
                {entries.map((entry) => (
                    <li key={entry.id}>
                        <Link href={entryHref(entry)} className={css.title}>
                            {entry.title}
                        </Link>
                        <span className={css.kind}>
                            {entry.type === 'movies' ? 'Film series' : 'Series'}
                        </span>
                        <button
                            type="button"
                            className={mineCss.secondary}
                            onClick={() => setValue(skipKey(entry.id), null)}
                        >
                            Bring back
                        </button>
                    </li>
                ))}
            </ul>
        </details>
    );
}

function OverviewPanel({
    data,
    index,
    syncing,
}: {
    data: UserData;
    index: SearchEntry[];
    syncing: boolean;
}) {
    const items = useMemo(() => listItems(data, index), [data, index]);
    const friends = friendsOf(data).length;

    return (
        <section className={mineCss.panel}>
            <h2>Your list</h2>
            <ul className={css.facts}>
                <li>
                    {count(rated(items).length, 'title')} rated and{' '}
                    {count(watchlist(items).length, 'title')} on your watchlist.{' '}
                    <Link href="/mine/" className={css.link}>
                        My list
                    </Link>
                </li>
                {syncAvailable && (
                    <>
                        <li>
                            {count(friends, 'friend')} to compare ratings with.{' '}
                            <Link href="/friends/" className={css.link}>
                                Friends
                            </Link>
                        </li>
                        <li>
                            Sync is {syncing ? 'on' : 'off'}. It’s turned on and
                            off on{' '}
                            <Link href="/mine/#sync" className={css.link}>
                                My list
                            </Link>
                            .
                        </li>
                    </>
                )}
            </ul>
        </section>
    );
}

const HERO_PAGES: Record<
    Kind,
    { heading: string; what: string; page: string; href: string }
> = {
    series: {
        heading: 'Featured series',
        what: 'series',
        page: 'Series',
        href: '/',
    },
    movies: {
        heading: 'Featured movies',
        what: 'film series',
        page: 'Movies',
        href: '/movies/',
    },
};

function HeroPanel({ kind }: { kind: Kind }) {
    const { heading, what, page, href } = HERO_PAGES[kind];
    const visibility = heroVisibility[kind].useStoredChoice();
    const [shownAgain, setShownAgain] = useState(false);

    const showAgain = () => {
        heroVisibility[kind].set('shown');
        setShownAgain(true);
    };

    const pageLink = (
        <Link href={href} className={css.link}>
            {page}
        </Link>
    );

    return (
        <section className={mineCss.panel}>
            <h2>{heading}</h2>
            {visibility === 'hidden' ? (
                <>
                    <p>
                        You’ve hidden the featured {what} at the top of{' '}
                        {pageLink}.
                    </p>
                    <button
                        type="button"
                        className={mineCss.button}
                        onClick={showAgain}
                    >
                        Show it again
                    </button>
                </>
            ) : (
                <p>
                    A featured {what} is shown at the top of {pageLink}. You can
                    hide it from its menu and show it again here.
                </p>
            )}
            {shownAgain && visibility === 'shown' && (
                <p className={mineCss.success} role="status">
                    It’s back at the top of {pageLink}.
                </p>
            )}
        </section>
    );
}

function TipsPanel() {
    const seen = useSeenTipCount();
    const [broughtBack, setBroughtBack] = useState(false);

    const showAgain = () => {
        resetTips();
        setBroughtBack(true);
    };

    return (
        <section className={mineCss.panel}>
            <h2>Tips</h2>
            <p>
                Tips point out shortcuts, like the arrow keys in{' '}
                <Link href="/swipe/" className={css.link}>
                    Swipe
                </Link>
                , and go away once you’ve used them. They’re kept in this
                browser.
            </p>
            <button
                type="button"
                className={mineCss.button}
                disabled={!seen}
                onClick={showAgain}
            >
                Show tips again
            </button>
            {broughtBack && seen === 0 && (
                <p className={mineCss.success} role="status">
                    The tips are back.
                </p>
            )}
        </section>
    );
}
