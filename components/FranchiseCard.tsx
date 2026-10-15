import { analyzeMovies } from '@/lib/franchiseAnalysis';
import { formatVotes, formatYears } from '@/lib/format';
import type { Franchise, Movie } from '@/lib/types';
import type { TrendCardProps } from './TrendCard';

const endpoint = (movie: Movie) => ({
    label: movie.year ? String(movie.year) : '',
    rating: movie.rating,
});

export function franchiseCardProps(franchise: Franchise): TrendCardProps {
    const trend = analyzeMovies(franchise);

    return {
        type: 'movies',
        id: franchise.id,
        title: franchise.title,
        startYear: franchise.startYear,
        endYear: franchise.endYear,
        poster: franchise.poster,
        href: `/movies/${franchise.id}/`,
        meta: `${formatYears(franchise)} · ${franchise.movies.length} movies · ${formatVotes(franchise.votes)} votes`,
        verdict: trend?.verdict,
        verdicts: trend?.verdicts,
        ratings: franchise.movies.map((movie) => movie.rating),
        trend: trend && {
            first: endpoint(trend.first),
            last: endpoint(trend.last),
            change: trend.change,
        },
    };
}
