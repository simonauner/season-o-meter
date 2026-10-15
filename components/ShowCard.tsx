import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { countOf, formatVotes, formatYears } from '@/lib/format';
import type { Show } from '@/lib/types';
import type { TrendCardProps } from './TrendCard';

export function showCardProps(show: Show): TrendCardProps {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);

    return {
        type: 'series',
        id: show.id,
        title: show.title,
        startYear: show.startYear,
        endYear: show.endYear,
        poster: show.poster,
        href: `/shows/${show.id}/`,
        meta: `${formatYears(show)} · ${countOf(seasons.length, 'season')} · ${formatVotes(show.votes)} votes`,
        verdict: trend?.verdict,
        verdicts: trend?.verdicts,
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
        single:
            seasons.length === 1
                ? { label: 'On IMDb', rating: show.rating }
                : undefined,
    };
}
