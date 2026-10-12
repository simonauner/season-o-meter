import Link from 'next/link';
import { formatRating, formatYears } from '@/lib/format';
import { ratingKey, valueOf, type UserData } from '@/lib/userData';
import {
    imdbScore,
    partAverage,
    rated,
    watchlist,
    type ListItem,
} from '@/lib/userList';
import { Sparkline } from './Sparkline';
import css from './userList.module.css';

const plural = (count: number, word: string) =>
    `${count} ${word}${count === 1 ? '' : 's'}`;

const describe = ({ entry, partRatings: { length: ratedParts } }: ListItem) => {
    if (entry.type === 'movies') {
        const movies = entry.movieIds?.length ?? entry.ratings.length;
        return ratedParts > 0
            ? `${ratedParts} of ${movies} movies rated`
            : plural(movies, 'movie');
    }
    return ratedParts > 0
        ? `${plural(ratedParts, 'season')} rated`
        : plural(entry.ratings.length, 'season');
};

const TYPES = [
    { type: 'series', title: 'TV series' },
    { type: 'movies', title: 'Film series' },
] as const;

type UserListsProps = Omit<UserListProps, 'title'>;

/** TV series and film series apart, each with its watchlist and ratings. */
export function UserLists({ items, ...props }: UserListsProps) {
    return TYPES.map(({ type, title }) => {
        const ofType = items.filter((item) => item.entry.type === type);
        if (ofType.length === 0) return null;
        return (
            <section key={type} className={css.group}>
                <h2>{title}</h2>
                <UserList
                    title="Watchlist"
                    items={watchlist(ofType)}
                    {...props}
                />
                <UserList title="Rated" items={rated(ofType)} {...props} />
            </section>
        );
    });
}

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
            <h3>
                {title} <span className={css.count}>{items.length}</span>
            </h3>
            <ul className={css.list}>
                {items.map((item) => {
                    const { entry, rating } = item;
                    const average = rating === null ? partAverage(item) : null;
                    const parts = entry.type === 'series' ? 'season' : 'movie';
                    const imdb = imdbScore(item);
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
                                        {[formatYears(entry), describe(item)]
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
                                            aria-label={`${owner} average ${parts} rating: ${formatRating(average)}`}
                                            title={`Average of the rated ${parts}s`}
                                        >
                                            {formatRating(average)}
                                        </span>
                                    ) : (
                                        <span
                                            className={css.rating}
                                            aria-label={`${owner} rating: none`}
                                        >
                                            –
                                        </span>
                                    )}
                                    {imdb !== null && (
                                        <span
                                            className={css.imdb}
                                            title={
                                                average !== null
                                                    ? `IMDb average of the same ${parts}s`
                                                    : undefined
                                            }
                                        >
                                            IMDb {formatRating(imdb)}
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
