'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Done } from '@/components/Done';
import { heroVisibility } from '@/components/Hero';
import { PageIntro } from '@/components/PageIntro';
import { deleteEverything, forgetThisBrowser } from '@/lib/deleteEverything';
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
import { RecoveryPanel } from './RecoveryPanel';
import { ConnectPrompt, SyncPanel } from './SyncPanel';

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

            <ConnectPrompt />

            {failed ? (
                <p className={mineCss.status}>Could not load your profile.</p>
            ) : !data || !index ? (
                <p className={mineCss.status}>Loading…</p>
            ) : (
                <div className={`${mineCss.panels} ${css.panels}`}>
                    <SkippedPanel data={data} index={index} />
                    <OverviewPanel data={data} index={index} />
                    <RecoveryPanel />
                    <SyncPanel />
                    <HeroPanel kind="series" />
                    <HeroPanel kind="movies" />
                    <TipsPanel />
                    <DangerZonePanel secret={secret} />
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

    const done = broughtBack !== null && skipped.size === 0;

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
                <p>
                    You’ve skipped{' '}
                    {skipped.size === 1
                        ? 'one title'
                        : `${skipped.size.toLocaleString('en')} series and film series`}
                    . They don’t come up in Swipe again until you bring them
                    back.
                </p>
            )}
            {(skipped.size > 0 || done) && (
                <div className={mineCss.buttons}>
                    <Button disabled={done} onClick={bringAllBack}>
                        Bring them all back
                    </Button>
                    {done && (
                        <Done>
                            Brought back {count(broughtBack, 'title')}. They’re
                            back in{' '}
                            <Link href="/swipe/" className={css.link}>
                                Swipe
                            </Link>
                            .
                        </Done>
                    )}
                </div>
            )}
            {entries.length > 0 && <SkippedList entries={entries} />}
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
                        <Button
                            onClick={() => setValue(skipKey(entry.id), null)}
                        >
                            Bring back
                        </Button>
                    </li>
                ))}
            </ul>
        </details>
    );
}

function OverviewPanel({
    data,
    index,
}: {
    data: UserData;
    index: SearchEntry[];
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
                    <li>
                        {count(friends, 'friend')} to compare ratings with.{' '}
                        <Link href="/friends/" className={css.link}>
                            Friends
                        </Link>
                    </li>
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
    const done = shownAgain && visibility === 'shown';

    return (
        <section className={mineCss.panel}>
            <h2>{heading}</h2>
            {visibility === 'hidden' ? (
                <p>
                    You’ve hidden the featured {what} at the top of {pageLink}.
                </p>
            ) : (
                <p>
                    A featured {what} is shown at the top of {pageLink}. You can
                    hide it from its menu and show it again here.
                </p>
            )}
            {(visibility === 'hidden' || done) && (
                <div className={mineCss.buttons}>
                    <Button disabled={done} onClick={showAgain}>
                        Show it again
                    </Button>
                    {done && <Done>It’s back at the top of {pageLink}.</Done>}
                </div>
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
                Tips point out what you can do here, like the welcome on{' '}
                <Link href="/" className={css.link}>
                    Series
                </Link>{' '}
                and the arrow keys in{' '}
                <Link href="/swipe/" className={css.link}>
                    Swipe
                </Link>
                , and go away once you’ve used or closed them. They’re kept in
                this browser.
            </p>
            <div className={mineCss.buttons}>
                <Button disabled={!seen} onClick={showAgain}>
                    Show tips again
                </Button>
                {broughtBack && seen === 0 && <Done>The tips are back.</Done>}
            </div>
        </section>
    );
}

type Removal = 'forget' | 'delete';

const REMOVALS: Record<Removal, { heading: string; button: string }> = {
    forget: {
        heading: 'Forget me in this browser',
        button: 'Forget me here…',
    },
    delete: {
        heading: 'Delete my data for good',
        button: 'Delete my data…',
    },
};

function DangerZonePanel({ secret }: { secret: string | null }) {
    const [confirming, setConfirming] = useState<Removal | null>(null);
    const [busy, setBusy] = useState(false);
    /** What was removed, while this browser is still without it. */
    const [result, setResult] = useState<{
        removal: Removal;
        text: string;
        secret: string | null;
        /** Whether this browser synced before, for the warning it was given. */
        synced: boolean;
    } | null>(null);
    const [failed, setFailed] = useState(false);
    const synced = syncAvailable && secret !== null;
    const cancelRef = useRef<HTMLButtonElement>(null);
    const done = result?.secret === secret ? result.removal : null;

    // The button that asked is gone, and Enter shouldn't remove anything
    // right away.
    useEffect(() => {
        if (confirming) cancelRef.current?.focus();
    }, [confirming]);

    const ask = (removal: Removal) => {
        setConfirming(removal);
        setResult(null);
        setFailed(false);
    };

    const remove = async (removal: Removal) => {
        setBusy(true);
        try {
            if (removal === 'forget') {
                forgetThisBrowser();
                setResult({
                    removal,
                    text: synced
                        ? 'This browser has forgotten you. Your recovery key brings everything back.'
                        : 'This browser has forgotten you.',
                    secret: null,
                    synced,
                });
            } else {
                await deleteEverything(secret);
                setResult({
                    removal,
                    text: 'Everything is deleted.',
                    secret: null,
                    synced,
                });
            }
            setConfirming(null);
        } catch {
            setFailed(true);
        }
        setBusy(false);
    };

    const descriptions: Record<Removal, string> = {
        forget: synced
            ? 'Removes your ratings, watchlist, friends and skipped titles from this browser, along with its tips and choices. Your synced list stays on the sync server, so your recovery key brings it back, here or in any other browser.'
            : 'Removes your ratings, watchlist, friends and skipped titles from this browser, along with its tips and choices. They’re only kept here, so without a recovery key nothing brings them back. Create one above first if you want to come back.',
        delete: synced
            ? 'Removes everything from this browser and deletes your synced list from the sync server. Your recovery key stops working, and your other devices stop syncing. What’s on them stays until you delete it there too.'
            : 'Removes everything from this browser. Nothing is kept anywhere else, so nothing brings it back.',
    };

    return (
        <section className={`${mineCss.panel} ${css.danger}`}>
            <h2>Danger zone</h2>
            <p>
                Want to keep a copy anyway? Make a share link on{' '}
                <Link href="/mine/#share" className={css.link}>
                    My list
                </Link>{' '}
                first.
            </p>
            {(['forget', 'delete'] as const).map((removal) => (
                <div key={removal} className={css.removal}>
                    <h3>{REMOVALS[removal].heading}</h3>
                    <p>{descriptions[removal]}</p>
                    {confirming === removal || done === removal ? (
                        <>
                            <p className={css.warning}>
                                {removal === 'forget' &&
                                (done === removal ? result?.synced : synced)
                                    ? 'Make sure you’ve saved your recovery key.'
                                    : 'This can’t be undone.'}
                            </p>
                            <div className={mineCss.buttons}>
                                <Button
                                    ref={cancelRef}
                                    disabled={busy || done === removal}
                                    onClick={() => setConfirming(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger-filled"
                                    disabled={busy || done === removal}
                                    onClick={() => remove(removal)}
                                >
                                    {busy
                                        ? 'Removing…'
                                        : removal === 'forget'
                                          ? 'Yes, forget me here'
                                          : 'Yes, delete my data'}
                                </Button>
                                {done === removal && (
                                    <Done>{result?.text}</Done>
                                )}
                            </div>
                            {failed && (
                                <p className={mineCss.problem} role="alert">
                                    Could not reach the sync server, so nothing
                                    was deleted. Try again in a moment.
                                </p>
                            )}
                        </>
                    ) : (
                        <Button variant="danger" onClick={() => ask(removal)}>
                            {REMOVALS[removal].button}
                        </Button>
                    )}
                </div>
            ))}
        </section>
    );
}
