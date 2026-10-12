import { formatChange, formatVotes } from '@/lib/format';
import type { Movie } from '@/lib/types';
import { RatingChart } from './RatingChart';

export function MovieChart({ movies }: { movies: Movie[] }) {
    return (
        <RatingChart
            label="Movie rating chart. Use the arrow keys to step through the movies."
            points={movies.map((movie, i) => {
                const previous = movies[i - 1];
                return {
                    key: movie.id,
                    axisLabel: movie.year ? String(movie.year) : `#${i + 1}`,
                    rating: movie.rating,
                    title: movie.title,
                    detail: [
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
