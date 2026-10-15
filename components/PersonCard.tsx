import { formatVotes, formatYears } from '@/lib/format';
import { analyzeCareer, countedMovies } from '@/lib/people';
import type { Person } from '@/lib/types';
import type { TrendCardProps } from './TrendCard';

export function personCardProps(person: Person, meta?: string): TrendCardProps {
    const trend = analyzeCareer(person);
    const movies = countedMovies(person);

    return {
        type: 'person',
        id: person.id,
        title: person.name,
        startYear: person.startYear,
        endYear: person.endYear,
        poster: person.poster,
        href: `/people/${person.id}/`,
        meta:
            meta ??
            `${formatYears(person)} · ${movies.length} movies · ${formatVotes(person.votes)} votes`,
        verdict: trend?.verdict,
        ratings: movies.map((movie) => movie.rating),
        // The averages, as on their page, since one movie says little
        // about a career.
        trend: trend && {
            first: { label: `First ${trend.span}`, rating: trend.early },
            last: { label: `Latest ${trend.span}`, rating: trend.recent },
            change: trend.change,
        },
    };
}
