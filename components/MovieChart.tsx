import { formatChange, formatVotes } from '@/lib/format';
import type { Movie } from '@/lib/types';
import { ratingKey } from '@/lib/userData';
import { RatingChart } from './RatingChart';

type MovieChartProps<T extends Movie> = {
    movies: T[];
    /** Said about a movie in its tooltip, like "Cameo". */
    note?: (movie: T) => string | undefined;
};

export function MovieChart<T extends Movie>({
    movies,
    note,
}: MovieChartProps<T>) {
    return (
        <RatingChart
            label="Movie rating chart. Use the arrow keys to step through the movies."
            ownKeys={movies.map((movie) => ratingKey(movie.id))}
            points={movies.map((movie, i) => {
                const previous = movies[i - 1];
                return {
                    key: movie.id,
                    axisLabel: movie.year ? String(movie.year) : `#${i + 1}`,
                    rating: movie.rating,
                    title: movie.title,
                    detail: [
                        note?.(movie),
                        movie.year,
                        `${formatVotes(movie.votes)} votes`,
                        previous &&
                            `${formatChange(movie.rating - previous.rating)} vs previous`,
                    ]
                        .filter(Boolean)
                        .join(' · '),
                };
            })}
        />
    );
}
