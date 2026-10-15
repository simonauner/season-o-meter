import { notFound } from 'next/navigation';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { getShow, getShows } from '@/lib/data';
import { countOf, formatYears } from '@/lib/format';
import { titleImage } from '@/lib/ogImage';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
    return getShows().map((show) => ({ id: show.id }));
}

export async function GET(
    _request: Request,
    { params }: RouteContext<'/shows/[id]/og.png'>
) {
    const show = getShow((await params).id);
    if (!show) notFound();
    const seasons = ratedSeasons(show.seasons);

    return titleImage({
        title: show.title,
        meta: [
            'TV series',
            formatYears(show),
            seasons.length === show.seasons.length
                ? countOf(seasons.length, 'season')
                : `${seasons.length} of ${show.seasons.length} seasons rated`,
        ],
        verdict: analyzeSeasons(show)?.verdict,
        bars: seasons.map((season) => ({
            rating: season.rating,
            label: `S${season.seasonNumber}`,
        })),
        single:
            show.seasons.length === 1
                ? { rating: show.rating, label: 'on IMDb' }
                : undefined,
    });
}
