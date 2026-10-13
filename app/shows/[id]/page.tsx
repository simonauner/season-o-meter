import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeasonChart } from '@/components/SeasonChart';
import { SeasonTable } from '@/components/SeasonTable';
import { Poster, type PosterEntry } from '@/components/Poster';
import { SharedPoster } from '@/components/PosterTransition';
import { StatTile } from '@/components/StatTile';
import { TitleActions } from '@/components/YourRating';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { getShow, getShows } from '@/lib/data';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
    sentence,
} from '@/lib/format';
import type { RatedSeason } from '@/lib/types';
import css from '../../detail.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
    return getShows().map((show) => ({ id: show.id }));
}

export async function generateMetadata({
    params,
}: PageProps<'/shows/[id]'>): Promise<Metadata> {
    const show = getShow((await params).id);
    if (!show) return {};
    const trend = analyzeSeasons(show);
    return {
        title: show.title,
        description: `${show.title} rated season by season.${trend ? ` ${sentence(trend.verdict)}` : ''}`,
    };
}

/** How wide the poster is shown, as in detail.module.css. */
const POSTER_SIZES = '(max-width: 639px) 104px, 200px';

const seasonDetail = (season: RatedSeason) =>
    `Season ${season.seasonNumber}${season.year ? ` (${season.year})` : ''}`;

export default async function Page({ params }: PageProps<'/shows/[id]'>) {
    const show = getShow((await params).id);
    if (!show) notFound();

    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);
    const poster: PosterEntry = {
        type: 'series',
        id: show.id,
        title: show.title,
        startYear: show.startYear,
        endYear: show.endYear,
        ratings: seasons.map((season) => season.rating),
        poster: show.poster,
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
                <SharedPoster id={show.id}>
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
                    <h1>{show.title}</h1>
                    <p className={css.meta}>
                        {formatYears(show)}
                        {show.genres.length > 0 &&
                            ` · ${show.genres.join(', ')}`}{' '}
                        ·{' '}
                        <a
                            href={`https://www.imdb.com/title/${show.id}/`}
                            rel="noreferrer"
                        >
                            IMDb
                        </a>
                    </p>
                    {trend && <p className={css.verdict}>{trend.verdict}</p>}
                </div>
                <div className={css.actions}>
                    <TitleActions id={show.id} />
                </div>
            </header>

            {trend ? (
                <>
                    <div className={css.stats}>
                        <StatTile
                            label="Best season"
                            value={formatRating(trend.best.rating)}
                            detail={seasonDetail(trend.best)}
                        />
                        <StatTile
                            label="Worst season"
                            value={formatRating(trend.worst.rating)}
                            detail={seasonDetail(trend.worst)}
                        />
                        <StatTile
                            label="First to last season"
                            value={formatChange(trend.change)}
                            detail={`S${trend.first.seasonNumber} ${formatRating(trend.first.rating)} → S${trend.last.seasonNumber} ${formatRating(trend.last.rating)}`}
                            tone={changeTone(trend.change)}
                        />
                        <StatTile
                            label="Series rating on IMDb"
                            value={formatRating(show.rating)}
                            detail={`${formatVotes(show.votes)} votes`}
                        />
                    </div>

                    <section className={css.section}>
                        <h2>Average episode rating per season</h2>
                        <SeasonChart showId={show.id} seasons={seasons} />
                    </section>
                </>
            ) : (
                <p className={css.empty}>
                    This series needs at least two fully rated seasons to show a
                    trend.
                </p>
            )}

            <section className={css.section}>
                <h2>Season by season</h2>
                <SeasonTable
                    showId={show.id}
                    seasons={show.seasons}
                    trend={trend}
                />
            </section>
        </article>
    );
}
