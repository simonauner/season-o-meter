import Link from 'next/link';
import { formatRating, formatYears } from '@/lib/format';
import { ratingKey, valueOf, type UserData } from '@/lib/userData';
import { partAverage, partCount, type ListItem } from '@/lib/userList';
import { Sparkline } from './Sparkline';
import css from './userList.module.css';

const plural = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

const describe = (item: ListItem) => {
    const ratedParts = item.partRatings.length;
    const total = partCount(item);
    const [kind, parts] =
        item.entry.type === 'movies'
            ? ['Film series', 'movie']
            : ['Series', 'season'];
    return [
        kind,
        ratedParts > 0
            ? `${ratedParts} of ${plural(total, parts)} rated`
            : plural(total, parts),
    ];
};

type UserListProps = {
    title: string;
    items: ListItem[];
    /** Whose ratings these are, for screen readers. */
    owner: 'Your' | 'Their';
    /** The visitor's own data, shown next to someone else's ratings. */
    compareWith?: UserData | null;
};

export function UserList({ title, items, owner, compareWith }: UserListProps) {
    if (items.length === 0) return null;

    return (
        <section className={css.section}>
            <h2>
                {title} <span className={css.count}>{items.length}</span>
            </h2>
            <ul className={css.list}>
                {items.map((item) => {
                    const { entry, rating } = item;
                    const average = rating === null ? partAverage(item) : null;
                    const parts = entry.type === 'series' ? 'season' : 'movie';
                    const ratedParts = item.partRatings.length;
                    const total = partCount(item);
                    // An average that leaves out seasons or movies not rated yet.
                    const partial = average !== null && ratedParts < total;
                    const yours =
                        compareWith &&
                        valueOf(compareWith, ratingKey(entry.id));
                    return (
                        <li key={entry.id}>
                            <Link
                                href={`/${entry.type === 'series' ? 'shows' : 'movies'}/${entry.id}/`}
                                className={css.row}
                            >
                                <span className={css.name}>
                                    <strong>{entry.title}</strong>
                                    <span>
                                        {[formatYears(entry), ...describe(item)]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                </span>
                                <span className={css.spark}>
                                    <Sparkline ratings={entry.ratings} />
                                </span>
                                <span className={css.score}>
                                    {rating !== null ? (
                                        <span
                                            className={css.rating}
                                            aria-label={`${owner} rating: ${rating}`}
                                        >
                                            {rating}
                                        </span>
                                    ) : average !== null ? (
                                        <span
                                            className={`${css.rating} ${css.average}`}
                                            aria-label={`${owner} average ${parts} rating: ${formatRating(average)}${partial ? `, ${ratedParts} of ${total} ${parts}s rated` : ''}`}
                                            title={
                                                partial
                                                    ? `Average of ${ratedParts} of ${plural(total, parts)}, the rest aren't rated yet`
                                                    : `Average of the rated ${parts}s`
                                            }
                                        >
                                            {formatRating(average)}
                                            {partial && (
                                                <span
                                                    className={css.partial}
                                                    aria-hidden="true"
                                                >
                                                    {ratedParts}/{total}
                                                </span>
                                            )}
                                        </span>
                                    ) : (
                                        <span
                                            className={css.rating}
                                            aria-label={`${owner} rating: none`}
                                        >
                                            –
                                        </span>
                                    )}
                                    {yours != null && (
                                        <span className={css.yours}>
                                            You: {yours}
                                        </span>
                                    )}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
