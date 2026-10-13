import { notFound } from 'next/navigation';
import { getFranchise, getFranchises } from '@/lib/data';
import { analyzeMovies } from '@/lib/franchiseAnalysis';
import { formatYears } from '@/lib/format';
import { titleImage } from '@/lib/ogImage';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
    return getFranchises().map((franchise) => ({ id: franchise.id }));
}

export async function GET(
    _request: Request,
    { params }: RouteContext<'/movies/[id]/og.png'>
) {
    const franchise = getFranchise((await params).id);
    if (!franchise) notFound();

    return titleImage({
        title: franchise.title,
        meta: [
            'Film series',
            formatYears(franchise),
            `${franchise.movies.length} movies`,
        ],
        verdict: analyzeMovies(franchise)?.verdict,
        bars: franchise.movies.map((movie, i) => ({
            rating: movie.rating,
            label: movie.year ? String(movie.year) : `#${i + 1}`,
        })),
    });
}
