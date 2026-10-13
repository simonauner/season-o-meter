import { analyzeMovies } from '@/lib/franchiseAnalysis';
import { formatRating, formatVotes, formatYears } from '@/lib/format';
import type { Franchise, Movie } from '@/lib/types';
import { Featured } from './Featured';
import { MovieChart } from './MovieChart';

/** Which movie a rating belongs to, kept short to fit beside it. */
const movieDetail = (franchise: Franchise, movie: Movie) =>
    movie.year ? String(movie.year) : `#${franchise.movies.indexOf(movie) + 1}`;

/** A film series given the full width at the top of the page. */
export function FeaturedFranchise({
    franchise,
    eyebrow,
}: {
    franchise: Franchise;
    /** Why it's featured, like "No. 1 in Most popular". */
    eyebrow: string;
}) {
    const trend = analyzeMovies(franchise);

    return (
        <Featured
            href={`/movies/${franchise.id}/`}
            poster={{
                type: 'movies',
                id: franchise.id,
                title: franchise.title,
                startYear: franchise.startYear,
                endYear: franchise.endYear,
                ratings: franchise.movies.map((movie) => movie.rating),
                poster: franchise.poster,
            }}
            eyebrow={eyebrow}
            meta={`${formatYears(franchise)} · ${franchise.movies.length} movies · ${formatVotes(franchise.votes)} votes`}
            verdict={trend?.verdict}
            stats={
                trend && [
                    {
                        label: 'Best movie',
                        detail: movieDetail(franchise, trend.best),
                        rating: formatRating(trend.best.rating),
                    },
                    {
                        label: 'Worst movie',
                        detail: movieDetail(franchise, trend.worst),
                        rating: formatRating(trend.worst.rating),
                    },
                    { label: 'Average', rating: formatRating(trend.average) },
                ]
            }
            more="See every movie"
            chart={
                franchise.movies.length >= 2 && (
                    <MovieChart movies={franchise.movies} />
                )
            }
        />
    );
}
