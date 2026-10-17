'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import { ChoicePicker } from '@/components/ChoicePicker';
import { PageIntro } from '@/components/PageIntro';
import {
    compareRows,
    sortRows,
    type CompareRow,
    type Score,
} from '@/lib/compare';
import { formatRating, formatYears } from '@/lib/format';
import {
    imaginaryName,
    isImaginary,
    newImaginaryId,
} from '@/lib/imaginaryFriend';
import {
    friendsOf,
    removeFriend,
    saveFriend,
    useFriendLists,
    type Friend,
} from '@/lib/friends';
import type { SearchEntry } from '@/lib/searchIndex';
import { storedChoice } from '@/lib/storedChoice';
import { syncAvailable, useSyncStatus } from '@/lib/sync';
import { MAX_NAME_LENGTH, type UserData } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import mineCss from '../mine/mine.module.css';
import { AddFriendForm } from './AddFriend';
import css from './friends.module.css';

const typeChoice = storedChoice<SearchEntry['type']>(
    'season-o-meter:compare-type',
    ['series', 'movies'],
    'series'
);

const TYPE_OPTIONS = [
    { value: 'series', label: 'TV series' },
    { value: 'movies', label: 'Film series' },
] as const;

const ratedByChoice = storedChoice<'everyone' | 'anyone'>(
    'season-o-meter:compare-rated-by',
    ['everyone', 'anyone'],
    'everyone'
);

const RATED_BY_OPTIONS = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'anyone', label: 'Anyone' },
] as const;

/** Whose column to sort by: the visitor, a friend's list id, or the average. */
type SortKey = 'you' | 'average' | string;

type Person = { key: SortKey; name: string; data: UserData };

export function Friends() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const friends = useMemo(() => (data ? friendsOf(data) : null), [data]);

    if (!syncAvailable) {
        return (
            <PageIntro title="Friends">
                Comparing with friends needs the sync server, which this version
                of the site doesn’t have.
            </PageIntro>
        );
    }

    return (
        <>
            <PageIntro title="Friends">
                Compare your ratings with your friends’, series by series and
                film series by film series.
            </PageIntro>

            {failed ? (
                <p className={mineCss.status}>Could not load the ratings.</p>
            ) : !data || !friends || !index ? (
                <p className={mineCss.status}>Loading…</p>
            ) : friends.length === 0 ? (
                <>
                    <p className={mineCss.status}>
                        No friends yet. Ask a friend for the live link to their
                        list. They find it under <em>Share your list</em> on
                        their <Link href="/mine/#share">My list</Link>. Open it,
                        or paste it below.
                    </p>
                    <p className={css.imaginary}>
                        Nobody to ask?{' '}
                        <button
                            type="button"
                            onClick={() =>
                                saveFriend(
                                    newImaginaryId(),
                                    imaginaryName(navigator.languages)
                                )
                            }
                        >
                            Bring an imaginary friend
                        </button>
                    </p>
                </>
            ) : (
                <Comparison data={data} friends={friends} index={index} />
            )}

            <div className={mineCss.panels}>
                <section className={mineCss.panel}>
                    <h2>Add a friend</h2>
                    <p>
                        Paste the link to their list. You only see their
                        ratings, and they only see yours if you send them your
                        link too.
                    </p>
                    <AddFriendForm />
                </section>
                {friends && friends.length > 0 && (
                    <FriendsPanel friends={friends} />
                )}
            </div>
        </>
    );
}

function Comparison({
    data,
    friends,
    index,
}: {
    data: UserData;
    friends: Friend[];
    index: SearchEntry[];
}) {
    const lists = useFriendLists(
        friends.map((friend) => friend.listId),
        data
    );
    const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
    const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
        key: 'average',
        descending: true,
    });
    const type = typeChoice.useChoice();
    const ratedBy = ratedByChoice.useChoice();

    const people = useMemo<Person[]>(
        () => [
            { key: 'you', name: 'You', data },
            ...friends.flatMap((friend) => {
                const list = lists[friend.listId];
                return list && !hidden.has(friend.listId)
                    ? [{ key: friend.listId, name: friend.name, data: list }]
                    : [];
            }),
        ],
        [data, friends, lists, hidden]
    );

    const rows = useMemo(() => {
        const all = compareRows(
            people.map((person) => person.data),
            index,
            type
        );
        const column = people.findIndex((person) => person.key === sort.key);
        return sortRows(
            ratedBy === 'everyone'
                ? all.filter((row) => row.scores.every(Boolean))
                : all,
            column === -1 ? 'average' : column,
            sort.descending
        );
    }, [people, index, type, ratedBy, sort]);

    const withAverage = people.length > 1;
    // A friend who was sorted by and then hidden falls back to the average.
    const sortKey = people.some((person) => person.key === sort.key)
        ? sort.key
        : 'average';
    const sortBy = (key: SortKey) =>
        setSort({
            key,
            descending: key === sortKey ? !sort.descending : true,
        });
    const toggle = (listId: string) => {
        const next = new Set(hidden);
        if (!next.delete(listId)) next.add(listId);
        setHidden(next);
    };

    const columns: { key: SortKey; name: string; short?: string }[] = [
        ...people,
        ...(withAverage
            ? [{ key: 'average', name: 'Average', short: 'Avg' }]
            : []),
    ];

    return (
        <section className={css.compare}>
            <div className={css.controls}>
                <ChoicePicker
                    label="Show"
                    options={TYPE_OPTIONS}
                    current={typeChoice.useStoredChoice()}
                    onChange={typeChoice.set}
                />
                <ChoicePicker
                    label="Rated by"
                    options={RATED_BY_OPTIONS}
                    current={ratedByChoice.useStoredChoice()}
                    onChange={ratedByChoice.set}
                />
                <div
                    className={css.chips}
                    role="group"
                    aria-label="Compare with"
                >
                    <span>Compare with</span>
                    {friends.map((friend) => {
                        const list = lists[friend.listId];
                        return (
                            <Button
                                key={friend.listId}
                                aria-pressed={
                                    list ? !hidden.has(friend.listId) : false
                                }
                                disabled={!list}
                                onClick={() => toggle(friend.listId)}
                            >
                                {friend.name}
                                {list === undefined
                                    ? ' …'
                                    : list === null
                                      ? ' (couldn’t load)'
                                      : ''}
                            </Button>
                        );
                    })}
                </div>
                <div className={css.sortControls}>
                    <label>
                        Sort by{' '}
                        <select
                            className={css.select}
                            value={sortKey}
                            onChange={(event) =>
                                setSort({
                                    key: event.target.value,
                                    descending: sort.descending,
                                })
                            }
                        >
                            {columns.map((column) => (
                                <option key={column.key} value={column.key}>
                                    {column.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Button
                        onClick={() =>
                            setSort({
                                key: sortKey,
                                descending: !sort.descending,
                            })
                        }
                    >
                        {sort.descending ? 'Highest first' : 'Lowest first'}
                    </Button>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className={mineCss.status}>
                    {ratedBy === 'everyone' && people.length > 1
                        ? `There’s no ${type === 'series' ? 'series' : 'film series'} that all of you have rated yet.`
                        : `Nobody has rated any ${type === 'series' ? 'series' : 'film series'} yet.`}
                </p>
            ) : (
                <div className={css.scroll}>
                    <table className={css.table}>
                        <thead>
                            <tr>
                                <th scope="col" className={css.title}>
                                    {type === 'series'
                                        ? 'Series'
                                        : 'Film series'}
                                </th>
                                {columns.map((column) => {
                                    const sorted = column.key === sortKey;
                                    return (
                                        <th
                                            key={column.key}
                                            scope="col"
                                            className={css.num}
                                            aria-sort={
                                                sorted
                                                    ? sort.descending
                                                        ? 'descending'
                                                        : 'ascending'
                                                    : undefined
                                            }
                                        >
                                            <button
                                                type="button"
                                                className={css.sort}
                                                title={column.name}
                                                onClick={() =>
                                                    sortBy(column.key)
                                                }
                                            >
                                                {column.short ? (
                                                    <>
                                                        <span
                                                            className={css.wide}
                                                        >
                                                            {column.name}
                                                        </span>
                                                        <span
                                                            className={
                                                                css.narrow
                                                            }
                                                            aria-hidden="true"
                                                        >
                                                            {column.short}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className={css.name}>
                                                        {column.name}
                                                    </span>
                                                )}
                                                <span aria-hidden="true">
                                                    {sorted
                                                        ? sort.descending
                                                            ? '↓'
                                                            : '↑'
                                                        : ''}
                                                </span>
                                            </button>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <Row
                                    key={row.entry.id}
                                    row={row}
                                    people={people}
                                    withAverage={withAverage}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function Row({
    row,
    people,
    withAverage,
}: {
    row: CompareRow;
    people: Person[];
    withAverage: boolean;
}) {
    const { entry } = row;
    return (
        <tr>
            <th scope="row" className={css.title}>
                <Link
                    href={`/${entry.type === 'series' ? 'shows' : 'movies'}/${entry.id}/`}
                >
                    {entry.title}
                </Link>
                <span>{formatYears(entry)}</span>
            </th>
            {row.scores.map((score, i) => (
                <td
                    key={people[i].key}
                    className={`${css.num} ${i === 0 ? css.yours : ''}`}
                >
                    <ScoreCell score={score} entry={entry} />
                </td>
            ))}
            {withAverage && (
                <td className={`${css.num} ${css.average}`}>
                    {formatRating(row.average)}
                </td>
            )}
        </tr>
    );
}

function ScoreCell({
    score,
    entry,
}: {
    score: Score | null;
    entry: SearchEntry;
}) {
    if (!score) {
        return <span aria-label="Not rated">–</span>;
    }
    if (!score.parts) return <>{score.value}</>;

    const { rated, total } = score.parts;
    const parts = entry.type === 'series' ? 'season' : 'movie';
    const partial = rated < total;
    const description = partial
        ? `Average of ${rated} of ${total} ${parts}s`
        : `Average of the ${parts}s`;
    return (
        <span
            className={css.partAverage}
            title={description}
            aria-label={`${formatRating(score.value)}, ${description.toLowerCase()}`}
        >
            {formatRating(score.value)}
            {partial && (
                <span className={css.partial} aria-hidden="true">
                    {rated}/{total}
                </span>
            )}
        </span>
    );
}

function FriendsPanel({ friends }: { friends: Friend[] }) {
    const syncing = useSyncStatus()?.secret != null;
    return (
        <section className={mineCss.panel}>
            <h2>Your friends</h2>
            <p>
                {syncing ? (
                    'Your friends are synced with your other devices.'
                ) : (
                    <>
                        Turn on sync on{' '}
                        <Link href="/profile/#sync">Profile</Link> to have your
                        friends on your other devices too.
                    </>
                )}
            </p>
            <ul className={css.friends}>
                {friends.map((friend) => (
                    // A rename on another device starts the field over.
                    <FriendRow
                        key={`${friend.listId}:${friend.name}`}
                        friend={friend}
                    />
                ))}
            </ul>
        </section>
    );
}

function FriendRow({ friend }: { friend: Friend }) {
    const [name, setName] = useState(friend.name);
    const rename = () => {
        if (name.trim() === '') setName(friend.name);
        else if (name !== friend.name) saveFriend(friend.listId, name);
    };
    return (
        <li>
            <input
                className={mineCss.link}
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={rename}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                }}
                maxLength={MAX_NAME_LENGTH}
                aria-label={`Name of ${friend.name}`}
                autoComplete="off"
            />
            {/* An imaginary friend's list is only in your head. */}
            {!isImaginary(friend.listId) && (
                <ButtonLink href={`/shared/#list=${friend.listId}`}>
                    List
                </ButtonLink>
            )}
            <Button
                variant="danger"
                onClick={() => removeFriend(friend.listId)}
            >
                Remove
            </Button>
        </li>
    );
}
