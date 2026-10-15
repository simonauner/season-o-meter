import { notFound } from 'next/navigation';
import { getPeople, getPerson } from '@/lib/data';
import { formatYears } from '@/lib/format';
import { titleImage } from '@/lib/ogImage';
import { analyzeCareer, countedMovies, roleLabels } from '@/lib/people';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
    return getPeople().map((person) => ({ id: person.id }));
}

export async function GET(
    _request: Request,
    { params }: RouteContext<'/people/[id]/og.png'>
) {
    const person = getPerson((await params).id);
    if (!person) notFound();
    const movies = countedMovies(person);

    return titleImage({
        title: person.name,
        meta: [
            roleLabels(person.roles),
            formatYears(person),
            `${movies.length} movies`,
        ],
        verdict: analyzeCareer(person)?.verdict,
        bars: movies.map((movie, i) => ({
            rating: movie.rating,
            label: movie.year ? String(movie.year) : `#${i + 1}`,
        })),
    });
}
