import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { countOf, formatRating, formatVotes, formatYears } from '@/lib/format';
import type { Show } from '@/lib/types';
import { Featured } from './Featured';
import { SeasonChart } from './SeasonChart';

/** A series given the full width at the top of the page. */
export function FeaturedShow({
    show,
    eyebrow,
}: {
    show: Show;
    /** Why it's featured, like "No. 1 in Most popular". */
    eyebrow: string;
}) {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);

    return (
        <Featured
            href={`/shows/${show.id}/`}
            poster={{
                type: 'series',
                id: show.id,
                title: show.title,
                startYear: show.startYear,
                endYear: show.endYear,
                ratings: seasons.map((season) => season.rating),
                poster: show.poster,
            }}
            eyebrow={eyebrow}
            meta={`${formatYears(show)} · ${countOf(seasons.length, 'season')} · ${formatVotes(show.votes)} votes`}
            verdict={trend?.verdict}
            stats={
                trend && [
                    {
                        label: 'Best season',
                        detail: `S${trend.best.seasonNumber}`,
                        rating: formatRating(trend.best.rating),
                    },
                    {
                        label: 'Worst season',
                        detail: `S${trend.worst.seasonNumber}`,
                        rating: formatRating(trend.worst.rating),
                    },
                    { label: 'On IMDb', rating: formatRating(show.rating) },
                ]
            }
            more="See every season"
            chart={
                seasons.length >= 2 && (
                    <SeasonChart showId={show.id} seasons={seasons} />
                )
            }
        />
    );
}
