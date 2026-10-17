'use client';

import { useEffect, useMemo, useState } from 'react';
import { imaginaryList, isImaginary } from './imaginaryFriend';
import { fetchList, useSyncStatus } from './sync';
import { isListId, listIdFor } from './syncProtocol';
import { friendKey, MAX_NAME_LENGTH, type UserData } from './userData';
import { setValue } from './userStore';

/**
 * Friends are other people's synced lists, added from the read-only link
 * they share. They are kept with the visitor's ratings, so they sync too.
 */
export type Friend = { listId: string; name: string };

/** The visitor's friends, by name. */
export function friendsOf(data: UserData): Friend[] {
    const friends: Friend[] = [];
    for (const [key, [value]] of Object.entries(data)) {
        if (key.startsWith('f:') && typeof value === 'string') {
            friends.push({ listId: key.slice('f:'.length), name: value });
        }
    }
    return friends.sort((a, b) => a.name.localeCompare(b.name));
}

/** A name as it's stored, or null if nothing is left of it. */
export const cleanName = (name: string) =>
    name.trim().slice(0, MAX_NAME_LENGTH).trim() || null;

/** Adds or renames a friend. */
export function saveFriend(listId: string, name: string) {
    const cleaned = cleanName(name);
    if (cleaned) setValue(friendKey(listId), cleaned);
}

export const removeFriend = (listId: string) =>
    setValue(friendKey(listId), null);

const LIVE_LINK = /#list=([A-Za-z0-9_-]{22})\b/;
const SNAPSHOT_LINK = /\/shared\/?#(?!list=)\S/;

/** Whether a link is to a snapshot of a list, which can't be followed. */
export const isSnapshotLink = (text: string) => SNAPSHOT_LINK.test(text);

/** The list id in a link to a synced list, or the id on its own. */
export function listIdFromLink(text: string) {
    const trimmed = text.trim();
    if (isListId(trimmed)) return trimmed;
    return LIVE_LINK.exec(trimmed)?.[1] ?? null;
}

/** Each friend's list, null where it couldn't be fetched. */
export type FriendLists = Record<string, UserData | null>;

/**
 * Fetches the lists, again whenever a friend is added. Lists fetched before
 * stay while the rest load. Imaginary friends' lists are made up from the
 * visitor's own, `own`.
 */
export function useFriendLists(listIds: string[], own: UserData) {
    const [fetched, setFetched] = useState<FriendLists>({});
    const key = listIds
        .filter((id) => !isImaginary(id))
        .sort()
        .join(',');
    const imaginary = listIds.filter(isImaginary).sort().join(',');

    useEffect(() => {
        let live = true;
        const ids = key ? key.split(',') : [];
        Promise.all(
            ids.map((id) =>
                fetchList(id).then(
                    (data) => [id, data] as const,
                    () => [id, null] as const
                )
            )
        ).then((results) => {
            if (live) setFetched(Object.fromEntries(results));
        });
        return () => {
            live = false;
        };
    }, [key]);

    return useMemo(() => {
        const lists = { ...fetched };
        for (const id of imaginary ? imaginary.split(',') : []) {
            lists[id] = imaginaryList(id, own);
        }
        return lists;
    }, [fetched, imaginary, own]);
}

/** The id of the visitor's own synced list, or null without sync. */
export function useOwnListId() {
    const secret = useSyncStatus()?.secret ?? null;
    const [own, setOwn] = useState<{ secret: string; listId: string } | null>(
        null
    );

    useEffect(() => {
        if (!secret) return;
        let live = true;
        listIdFor(secret).then((listId) => {
            if (live) setOwn({ secret, listId });
        });
        return () => {
            live = false;
        };
    }, [secret]);

    return own && own.secret === secret ? own.listId : null;
}
