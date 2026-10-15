import Link from 'next/link';
import { Fragment } from 'react';
import type { MovieTrend } from '@/lib/franchiseAnalysis';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
} from '@/lib/format';
import { type MoviePerson, roleLabels } from '@/lib/people';
import type { Movie } from '@/lib/types';
import { ratingKey } from '@/lib/userData';
import { RatingSelect } from './YourRating';
import css from './ratingTable.module.css';

type MovieTableProps<T extends Movie> = {
    movies: T[];
    trend: Pick<MovieTrend, 'best' | 'worst'> | null;
    /** Someone's part in each movie, for a column of its own. */
    credit?: (movie: T) => string;
    /** Whether visitors can rate each movie. */
    rateable?: boolean;
    /** People who made each movie, linked to under its title. */
    people?: (movie: T) => MoviePerson[];
    /**
     * Why a movie isn't counted, if it isn't, as its tag. It's faded, and
     * the changes skip it.
     */
    uncounted?: (movie: T) => string | undefined;
};

export function MovieTable<T extends Movie>({
    movies,
    trend,
    credit,
    rateable = true,
    people,
    uncounted,
}: MovieTableProps<T>) {
    return (
        <div className={css.scroll}>
            <table
                className={`${css.table} ${css.cards} ${credit ? css.credited : ''}`}
            >
                <thead>
                    <tr>
                        <th scope="col">Movie</th>
                        {credit && <th scope="col">Role</th>}
                        <th scope="col">Released</th>
                        <th scope="col" className={css.num}>
                            Votes
                        </th>
                        <th scope="col" className={css.num}>
                            Rating
                        </th>
                        <th scope="col" className={css.num}>
                            Change
                        </th>
                        {rateable && (
                            <th scope="col" className={css.num}>
                                You
                            </th>
                        )}
                        <th scope="col" className={css.barCol}>
                            <span className="visually-hidden">Rating bar</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {movies.map((movie, index) => {
                        const left = uncounted?.(movie);
                        const previous = movies
                            .slice(0, index)
                            .findLast((other) => !uncounted?.(other));
                        const change =
                            previous && !left
                                ? movie.rating - previous.rating
                                : null;
                        const tag =
                            left ??
                            (trend?.best === movie
                                ? 'Best'
                                : trend?.worst === movie
                                  ? 'Worst'
                                  : null);

                        return (
                            <tr
                                key={movie.id}
                                className={left ? css.uncounted : undefined}
                            >
                                <th scope="row" className={css.title}>
                                    <a
                                        href={`https://www.imdb.com/title/${movie.id}/`}
                                        rel="noreferrer"
                                    >
                                        {movie.title}
                                    </a>
                                    {tag && (
                                        <span className={css.tag}>{tag}</span>
                                    )}
                                    <MoviePeople people={people?.(movie)} />
                                </th>
                                {credit && (
                                    <td className={css.credit}>
                                        {credit(movie)}
                                    </td>
                                )}
                                <td className={css.year}>
                                    {movie.year ?? '–'}
                                </td>
                                <td className={`${css.num} ${css.votes}`}>
                                    {formatVotes(movie.votes)}
                                </td>
                                <td className={`${css.num} ${css.rating}`}>
                                    {formatRating(movie.rating)}
                                </td>
                                <td
                                    className={`${css.num} ${css.change} ${
                                        change === null
                                            ? ''
                                            : (css[changeTone(change) ?? ''] ??
                                              '')
                                    }`}
                                >
                                    {change === null
                                        ? ''
                                        : formatChange(change)}
                                </td>
                                {rateable && (
                                    <td className={`${css.num} ${css.you}`}>
                                        <RatingSelect
                                            storeKey={ratingKey(movie.id)}
                                            label={`Your rating of ${movie.title}`}
                                        />
                                    </td>
                                )}
                                <td className={css.barCol}>
                                    <span
                                        className={css.bar}
                                        style={{
                                            width: `${movie.rating * 10}%`,
                                        }}
                                    />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function MoviePeople({ people }: { people?: MoviePerson[] }) {
    if (!people?.length) return null;
    return (
        <span className={css.people}>
            {people.map(({ person, roles }, i) => (
                <Fragment key={person.id}>
                    {i > 0 && ' · '}
                    <Link
                        href={`/people/${person.id}/`}
                        title={roleLabels(roles)}
                    >
                        {person.name}
                    </Link>
                </Fragment>
            ))}
        </span>
    );
}
