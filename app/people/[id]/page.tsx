import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CareerChart } from '@/components/CareerChart';
import { MovieTable } from '@/components/MovieTable';
import { PersonGrid } from '@/components/PersonGrid';
import { Poster, type PosterEntry } from '@/components/Poster';
import { SharedPoster } from '@/components/PosterTransition';
import { StatTile } from '@/components/StatTile';
import { getPeople, getPerson } from '@/lib/data';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
    sentence,
} from '@/lib/format';
import { openGraph } from '@/lib/openGraph';
import {
    analyzeCareer,
    countedMovies,
    creditText,
    isCounted,
    roleLabels,
    roleVerbs,
    workedWith,
} from '@/lib/people';
import { summarizeCareer } from '@/lib/summaries';
import type { Movie } from '@/lib/types';
import css from '../../detail.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
    return getPeople().map((person) => ({ id: person.id }));
}

const movieDetail = (movie: Movie) =>
    `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;

export async function generateMetadata({
    params,
}: PageProps<'/people/[id]'>): Promise<Metadata> {
    const person = getPerson((await params).id);
    if (!person) return {};
    const trend = analyzeCareer(person);
    const years = formatYears(person);
    // Worded for what people search for: "<name> movies ranked".
    return {
        title: `${person.name} Movies Ranked, Best to Worst`,
        description: trend
            ? `The best ${person.name} movie is ${movieDetail(trend.best)} at ${formatRating(trend.best.rating)}, and the worst is ${movieDetail(trend.worst)} at ${formatRating(trend.worst.rating)}. ${sentence(trend.verdict)} IMDb ratings of all ${countedMovies(person).length} movies ${person.name} ${roleVerbs(person.roles)}${years ? `, ${years}` : ''}.`
            : `The movies ${person.name} ${roleVerbs(person.roles)}, rated.`,
        alternates: { canonical: `/people/${person.id}/` },
        openGraph: openGraph(
            `/people/${person.id}/og.png`,
            `Bar chart of the ratings of ${person.name}'s movies`
        ),
    };
}

/** How wide the photo is shown, as in detail.module.css. */
const POSTER_SIZES = '(max-width: 639px) 104px, 200px';

export default async function Page({ params }: PageProps<'/people/[id]'>) {
    const person = getPerson((await params).id);
    if (!person) notFound();

    const trend = analyzeCareer(person);
    const counted = countedMovies(person);
    const cameos = person.movies.length - counted.length;
    const poster: PosterEntry = {
        type: 'person',
        id: person.id,
        title: person.name,
        startYear: person.startYear,
        endYear: person.endYear,
        ratings: counted.map((movie) => movie.rating),
        poster: person.poster,
    };
    // Who played whom is worth a column, and so is which movies someone
    // directed and which they wrote, but not the same role in every row.
    const showCredits =
        person.roles.length > 1 || person.roles.includes('actor');
    const related = workedWith(person, getPeople());

    return (
        <article className={css.show}>
            <header className={css.header}>
                <div className={css.backdrop} aria-hidden>
                    <Poster
                        entry={poster}
                        sizes={POSTER_SIZES}
                        eager
                        untitled
                    />
                </div>
                <SharedPoster id={person.id}>
                    <div className={css.poster}>
                        <Poster
                            entry={poster}
                            sizes={POSTER_SIZES}
                            eager
                            untitled
                        />
                    </div>
                </SharedPoster>
                <div className={css.heading}>
                    <h1>{person.name}</h1>
                    <p className={css.meta}>
                        {roleLabels(person.roles)} · {formatYears(person)} ·{' '}
                        {counted.length} movies
                        {cameos > 0 &&
                            ` + ${cameos} ${cameos === 1 ? 'cameo' : 'cameos'}`}{' '}
                        ·{' '}
                        <a
                            href={`https://www.imdb.com/name/${person.id}/`}
                            rel="noreferrer"
                        >
                            IMDb
                        </a>
                    </p>
                    {trend && <p className={css.verdict}>{trend.verdict}</p>}
                </div>
            </header>

            {trend && (
                <>
                    <div className={css.stats}>
                        <StatTile
                            label="Best movie"
                            value={formatRating(trend.best.rating)}
                            detail={movieDetail(trend.best)}
                        />
                        <StatTile
                            label="Worst movie"
                            value={formatRating(trend.worst.rating)}
                            detail={movieDetail(trend.worst)}
                        />
                        <StatTile
                            label={`First ${trend.span} to latest ${trend.span}`}
                            value={formatChange(trend.change)}
                            detail={`${formatRating(trend.early)} → ${formatRating(trend.recent)} on average`}
                            tone={changeTone(trend.change)}
                        />
                        <StatTile
                            label="Average rating"
                            value={formatRating(trend.average)}
                            detail={`${formatVotes(person.votes)} votes in total`}
                        />
                    </div>

                    <section className={css.section}>
                        <h2>IMDb rating per movie</h2>
                        <CareerChart movies={person.movies} />
                        <p className={css.summary}>
                            {summarizeCareer(person, trend)}
                        </p>
                    </section>
                </>
            )}

            <section className={css.section}>
                <h2>Movie by movie</h2>
                <MovieTable
                    movies={person.movies}
                    trend={trend}
                    credit={showCredits ? creditText : undefined}
                    rateable={false}
                    uncounted={(movie) =>
                        isCounted(movie) ? undefined : 'Cameo'
                    }
                />
                <p className={css.summary}>
                    Movies with at least 10,000 votes on IMDb.
                    {cameos > 0 &&
                        ' Cameos, billed after the first 20 or uncredited, are listed but not counted.'}
                </p>
            </section>

            {related.length > 0 && (
                <section className={css.related}>
                    <h2>Worked with</h2>
                    <PersonGrid
                        people={related.map(({ person: other, together }) => ({
                            person: other,
                            meta: `${roleLabels(other.roles)} · ${together} ${together === 1 ? 'movie' : 'movies'} together`,
                        }))}
                    />
                </section>
            )}
        </article>
    );
}
