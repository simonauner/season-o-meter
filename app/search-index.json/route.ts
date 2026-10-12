import { ratedSeasons } from '@/lib/analysis';
import { getFranchises, getShows } from '@/lib/data';
import type { SearchEntry } from '@/lib/searchIndex';

export const dynamic = 'force-static';

const roundRating = (rating: number) => Math.round(rating * 10) / 10;

export function GET() {
    const series = getShows().map((show): SearchEntry => ({
        type: 'series',
        id: show.id,
        title: show.title,
        startYear: show.startYear,
        endYear: show.endYear,
        votes: show.votes,
        ratings: ratedSeasons(show.seasons).map((season) =>
            roundRating(season.rating)
        ),
        seasonCount: show.seasons.length,
    }));
    const movies = getFranchises().map((franchise): SearchEntry => ({
        type: 'movies',
        id: franchise.id,
        title: franchise.title,
        startYear: franchise.startYear,
        endYear: franchise.endYear,
        votes: franchise.votes,
        ratings: franchise.movies.map((movie) => roundRating(movie.rating)),
        movieIds: franchise.movies.map((movie) => movie.id),
    }));
    const entries = [...series, ...movies].sort((a, b) => b.votes - a.votes);
    return Response.json(entries);
}
