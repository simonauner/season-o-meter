import type { MovieTrend } from '@/lib/franchiseAnalysis';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
} from '@/lib/format';
import type { Movie } from '@/lib/types';
import css from './ratingTable.module.css';

type MovieTableProps = {
    movies: Movie[];
    trend: MovieTrend | null;
};

export function MovieTable({ movies, trend }: MovieTableProps) {
    return (
        <div className={css.scroll}>
            <table className={css.table}>
                <thead>
                    <tr>
                        <th scope="col">Movie</th>
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
                        <th scope="col" className={css.barCol}>
                            <span className="visually-hidden">Rating bar</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {movies.map((movie, index) => {
                        const previous = movies[index - 1];
                        const change = previous
                            ? movie.rating - previous.rating
                            : null;
                        const tag =
                            trend?.best === movie
                                ? 'Best'
                                : trend?.worst === movie
                                  ? 'Worst'
                                  : null;

                        return (
                            <tr key={movie.id}>
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
                                </th>
                                <td>{movie.year ?? '–'}</td>
                                <td className={css.num}>
                                    {formatVotes(movie.votes)}
                                </td>
                                <td className={`${css.num} ${css.rating}`}>
                                    {formatRating(movie.rating)}
                                </td>
                                <td
                                    className={`${css.num} ${
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
