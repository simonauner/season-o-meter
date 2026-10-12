import { analyzeMovies } from '@/lib/franchiseAnalysis';
import { formatVotes, formatYears } from '@/lib/format';
import type { Franchise, Movie } from '@/lib/types';
import { TrendCard } from './TrendCard';

const endpoint = (movie: Movie) => ({
    label: movie.year ? String(movie.year) : '',
    rating: movie.rating,
});

export function FranchiseCard({ franchise }: { franchise: Franchise }) {
    const trend = analyzeMovies(franchise);

    return (
        <TrendCard
            href={`/movies/${franchise.id}/`}
            title={franchise.title}
            meta={`${formatYears(franchise)} · ${franchise.movies.length} movies · ${formatVotes(franchise.votes)} votes`}
            verdict={trend?.verdict}
            ratings={franchise.movies.map((movie) => movie.rating)}
            trend={
                trend && {
                    first: endpoint(trend.first),
                    last: endpoint(trend.last),
                    change: trend.change,
                }
            }
        />
    );
}
