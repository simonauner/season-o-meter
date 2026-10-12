import { franchiseCardProps } from '@/components/FranchiseCard';
import { getFranchises } from '@/lib/data';
import { findFranchiseSections } from '@/lib/franchiseAnalysis';
import { buildHomeSections, type HomeSections } from '@/lib/homeSections';

export const dynamic = 'force-static';

export function GET() {
    const { sections, cards, items } = buildHomeSections(
        (minMovies) =>
            findFranchiseSections(getFranchises(), Infinity, minMovies),
        franchiseCardProps
    );
    const movieIds = Object.fromEntries(
        items.map((franchise) => [
            franchise.id,
            franchise.movies.map((movie) => movie.id),
        ])
    );
    return Response.json({ sections, cards, movieIds } satisfies HomeSections);
}
