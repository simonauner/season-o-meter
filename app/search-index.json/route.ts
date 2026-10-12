import { ratedSeasons } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import type { SearchEntry } from '@/lib/searchIndex';

export const dynamic = 'force-static';

export function GET() {
    const entries: SearchEntry[] = getShows().map((show) => ({
        id: show.id,
        title: show.title,
        startYear: show.startYear,
        endYear: show.endYear,
        votes: show.votes,
        ratings: ratedSeasons(show.seasons).map(
            (season) => Math.round(season.rating * 10) / 10
        ),
    }));
    return Response.json(entries);
}
