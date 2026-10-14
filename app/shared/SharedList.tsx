'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Done } from '@/components/Done';
import { PageIntro } from '@/components/PageIntro';
import { UserLists } from '@/components/UserList';
import { fetchList, syncAvailable } from '@/lib/sync';
import { isListId } from '@/lib/syncProtocol';
import { decodeShare, type UserData } from '@/lib/userData';
import { listItems } from '@/lib/userList';
import { importData, useUserData } from '@/lib/userStore';
import { useHash } from '@/lib/useHash';
import { useSearchIndex } from '@/lib/useSearchIndex';
import { AddFriendPanel } from '../friends/AddFriend';
import css from '../mine/mine.module.css';

const LIVE_PREFIX = 'list=';

/** The id of a live list's link, or null for a snapshot. */
const liveListId = (hash: string) =>
    hash.startsWith(LIVE_PREFIX) ? hash.slice(LIVE_PREFIX.length) : null;

/** A live list from the sync server, or a snapshot carried in the link. */
async function load(hash: string): Promise<UserData | null> {
    const listId = liveListId(hash);
    if (listId === null) return decodeShare(hash);
    if (!syncAvailable || !isListId(listId)) return null;
    return fetchList(listId).catch(() => null);
}

export function SharedList() {
    const hash = useHash();
    const [decoded, setDecoded] = useState<{
        hash: string;
        data: UserData | null;
    } | null>(null);
    const own = useUserData();
    const { index, failed } = useSearchIndex();
    const [imported, setImported] = useState<number | null>(null);
    /** Each import gleams again. */
    const [imports, setImports] = useState(0);

    useEffect(() => {
        if (hash === null) return;
        let live = true;
        load(hash).then((data) => {
            if (live) setDecoded({ hash, data });
        });
        return () => {
            live = false;
        };
    }, [hash]);

    // Undefined while the link is being read, null if it isn't a list.
    const shared = decoded?.hash === hash ? decoded.data : undefined;
    const items = useMemo(
        () => (shared && index ? listItems(shared, index) : null),
        [shared, index]
    );

    const friendListId = shared && hash !== null ? liveListId(hash) : null;

    if (shared === null) {
        return (
            <PageIntro title="Shared list">
                Could not open this list. Check that the whole link was copied,
                or try again later.
            </PageIntro>
        );
    }

    return (
        <>
            <PageIntro title="Shared list">
                Someone shared their ratings and watchlist with you. Where
                you&apos;ve rated the same title, your rating is shown too.
            </PageIntro>

            {failed ? (
                <p className={css.status}>Could not load the list.</p>
            ) : !items ? (
                <p className={css.status}>Loading…</p>
            ) : items.length === 0 ? (
                <p className={css.status}>This list is empty.</p>
            ) : (
                <UserLists items={items} owner="Their" compareWith={own} />
            )}

            {shared && (
                <div className={css.panels}>
                    {/* Only a live list stays up to date to compare with. */}
                    {friendListId && <AddFriendPanel listId={friendListId} />}
                    <section className={css.panel}>
                        <h2>Is this your own list?</h2>
                        <p>
                            Import it to keep it on this device too. Where both
                            have a rating or watchlist entry for the same thing,
                            the most recent change wins.
                        </p>
                        <div className={css.buttons}>
                            <Button
                                disabled={!own}
                                onClick={() => {
                                    setImported(importData(shared));
                                    setImports((n) => n + 1);
                                }}
                            >
                                Import into my list
                            </Button>
                            {imported !== null && (
                                <Done key={imports}>
                                    {imported === 0
                                        ? 'Your list already had everything.'
                                        : `${imported} ratings and watchlist entries were added or updated.`}{' '}
                                    <Link href="/mine/">See my list</Link>
                                </Done>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
