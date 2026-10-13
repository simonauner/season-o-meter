import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { formatVotes, formatYears } from '@/lib/format';
import type { Show } from '@/lib/types';
import { TrendCard, type TrendCardProps } from './TrendCard';

export function showCardProps(show: Show): TrendCardProps {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);

    return {
        href: `/shows/${show.id}/`,
        title: show.title,
        meta: `${formatYears(show)} · ${seasons.length} seasons · ${formatVotes(show.votes)} votes`,
        verdict: trend?.verdict,
        ratings: seasons.map((season) => season.rating),
        trend: trend && {
            first: {
                label: `S${trend.first.seasonNumber}`,
                rating: trend.first.rating,
            },
            last: {
                label: `S${trend.last.seasonNumber}`,
                rating: trend.last.rating,
            },
            change: trend.change,
        },
    };
}

type ShowCardProps = {
    show: Show;
    hideVerdict?: boolean;
};

export function ShowCard({ show, hideVerdict }: ShowCardProps) {
    const props = showCardProps(show);
    return (
        <TrendCard
            {...props}
            verdict={hideVerdict ? undefined : props.verdict}
        />
    );
}
