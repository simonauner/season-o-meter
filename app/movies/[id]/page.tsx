import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MovieChart } from '@/components/MovieChart';
import { MovieTable } from '@/components/MovieTable';
import { StatTile } from '@/components/StatTile';
import { TitleActions } from '@/components/YourRating';
import { getFranchise, getFranchises } from '@/lib/data';
import { analyzeMovies } from '@/lib/franchiseAnalysis';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
} from '@/lib/format';
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
    return {
        title: franchise.title,
        description: `${franchise.title} rated movie by movie${trend ? `: ${trend.verdict.toLowerCase()}` : ''}.`,
    };
}

const movieDetail = (movie: Movie) =>
    `${movie.title}${movie.year ? ` (${movie.year})` : ''}`;

export default async function Page({ params }: PageProps<'/movies/[id]'>) {
    const franchise = getFranchise((await params).id);
    if (!franchise) notFound();

    const trend = analyzeMovies(franchise);

    return (
        <article className={css.show}>
            <header className={css.header}>
                <h1>{franchise.title}</h1>
                <p className={css.meta}>
                    {formatYears(franchise)} · {franchise.movies.length} movies
                    ·{' '}
                    <a
                        href={`https://www.wikidata.org/wiki/${franchise.id}`}
                        rel="noreferrer"
                    >
                        Wikidata
                    </a>
                </p>
                {trend && <p className={css.verdict}>{trend.verdict}</p>}
                <TitleActions id={franchise.id} />
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
                    </section>
                </>
            )}

            <section className={css.section}>
                <h2>Movie by movie</h2>
                <MovieTable movies={franchise.movies} trend={trend} />
            </section>
        </article>
    );
}
