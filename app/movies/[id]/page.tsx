import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { MovieChart } from '@/components/MovieChart';
import { MovieTable } from '@/components/MovieTable';
import { Poster, type PosterEntry } from '@/components/Poster';
import { SharedPoster } from '@/components/PosterTransition';
import { StatTile } from '@/components/StatTile';
import { TitleActions } from '@/components/YourRating';
import { getFranchise, getFranchises, getPeople } from '@/lib/data';
import { analyzeMovies } from '@/lib/franchiseAnalysis';
import {
    changeTone,
    distinctTitle,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
    sentence,
    yearsInText,
} from '@/lib/format';
import { openGraph } from '@/lib/openGraph';
import { moviePeople } from '@/lib/people';
import { relatedFranchises } from '@/lib/related';
import { summarizeMovies } from '@/lib/summaries';
import type { Movie } from '@/lib/types';
import css from '../../detail.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
    return getFranchises().map((franchise) => ({ id: franchise.id }));
}

export async function generateMetadata({
    params,
}: PageProps<'/movies/[id]'>): Promise<Metadata> {
    const franchise = getFranchise((await params).id);
    if (!franchise) return {};
    const trend = analyzeMovies(franchise);
    const name = distinctTitle(franchise, getFranchises());
    const years = yearsInText(franchise);
    // Worded for what people search for: "<series> movies ranked",
    // "best <series> movie".
    return {
        title: trend
            ? `${name}: ${franchise.movies.length} Movies Ranked, Best to Worst`
            : `${name} Movie Ratings`,
        description: trend
            ? `The best movie in ${franchise.title} is ${movieDetail(trend.best)} at ${formatRating(trend.best.rating)}, and the worst is ${movieDetail(trend.worst)} at ${formatRating(trend.worst.rating)}. ${sentence(trend.verdict)} IMDb ratings movie by movie${years ? `, ${years}` : ''}.`
            : `${franchise.title} rated movie by movie.`,
        alternates: { canonical: `/movies/${franchise.id}/` },
        openGraph: openGraph(
            `/movies/${franchise.id}/og.png`,
            `Bar chart of ${franchise.title}'s ratings movie by movie`
        ),
    };
}

/** How wide the poster is shown, as in detail.module.css. */
const POSTER_SIZES = '(max-width: 639px) 104px, 200px';

const movieDetail = (movie: Movie) =>
    `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;

export default async function Page({ params }: PageProps<'/movies/[id]'>) {
    const franchise = getFranchise((await params).id);
    if (!franchise) notFound();

    const trend = analyzeMovies(franchise);
    const poster: PosterEntry = {
        type: 'movies',
        id: franchise.id,
        title: franchise.title,
        startYear: franchise.startYear,
        endYear: franchise.endYear,
        ratings: franchise.movies.map((movie) => movie.rating),
        poster: franchise.poster,
    };

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
                <SharedPoster id={franchise.id}>
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
                    <h1>{franchise.title}</h1>
                    <p className={css.meta}>
                        {formatYears(franchise)} · {franchise.movies.length}{' '}
                        movies ·{' '}
                        <a
                            href={`https://www.wikidata.org/wiki/${franchise.id}`}
                            rel="noreferrer"
                        >
                            Wikidata
                        </a>
                    </p>
                    {trend && <p className={css.verdict}>{trend.verdict}</p>}
                </div>
                <div className={css.actions}>
                    <TitleActions id={franchise.id} />
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
                            label="First to latest movie"
                            value={formatChange(trend.change)}
                            detail={`${formatRating(trend.first.rating)} → ${formatRating(trend.last.rating)}`}
                            tone={changeTone(trend.change)}
                        />
                        <StatTile
                            label="Average rating"
                            value={formatRating(trend.average)}
                            detail={`${formatVotes(franchise.votes)} votes in total`}
                        />
                    </div>

                    <section className={css.section}>
                        <h2>IMDb rating per movie</h2>
                        <MovieChart movies={franchise.movies} />
                        <p className={css.summary}>
                            {summarizeMovies(franchise, trend)}
                        </p>
                    </section>
                </>
            )}

            <section className={css.section}>
                <h2>Movie by movie</h2>
                <MovieTable
                    movies={franchise.movies}
                    trend={trend}
                    people={(movie) => moviePeople(movie.id, getPeople())}
                />
            </section>

            <section className={css.related}>
                <h2>Related film series</h2>
                <FranchiseGrid
                    franchises={relatedFranchises(franchise, getFranchises())}
                />
            </section>
        </article>
    );
}
