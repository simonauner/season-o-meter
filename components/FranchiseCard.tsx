import { analyzeMovies } from '@/lib/franchiseAnalysis';
import { formatVotes, formatYears } from '@/lib/format';
import type { Franchise, Movie } from '@/lib/types';
import { TrendCard, type TrendCardProps } from './TrendCard';

const endpoint = (movie: Movie) => ({
    label: movie.year ? String(movie.year) : '',
    rating: movie.rating,
});

export function franchiseCardProps(franchise: Franchise): TrendCardProps {
    const trend = analyzeMovies(franchise);

    return {
        href: `/movies/${franchise.id}/`,
        title: franchise.title,
        meta: `${formatYears(franchise)} · ${franchise.movies.length} movies · ${formatVotes(franchise.votes)} votes`,
        verdict: trend?.verdict,
        ratings: franchise.movies.map((movie) => movie.rating),
        trend: trend && {
            first: endpoint(trend.first),
            last: endpoint(trend.last),
            change: trend.change,
        },
    };
}

export function FranchiseCard({ franchise }: { franchise: Franchise }) {
    return <TrendCard {...franchiseCardProps(franchise)} />;
}
