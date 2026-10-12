import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { SeasonChart } from '@/components/SeasonChart';
import { SeasonTable } from '@/components/SeasonTable';
import { SetupNotice } from '@/components/SetupNotice';
import { StatTile } from '@/components/StatTile';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { formatChange, formatRating, posterUrl, year } from '@/lib/format';
import { getShow, isTmdbConfigured } from '@/lib/tmdb';
import css from './show.module.css';

const parseId = (id: string) => (/^\d+$/.test(id) ? Number(id) : null);

export async function generateMetadata({
    params,
}: PageProps<'/shows/[id]'>): Promise<Metadata> {
    const id = parseId((await params).id);
    if (id === null || !isTmdbConfigured()) return {};
    const show = await getShow(id);
    return show ? { title: show.name, description: show.overview } : {};
}

async function ShowDetails({
    params,
}: Pick<PageProps<'/shows/[id]'>, 'params'>) {
    const id = parseId((await params).id);
    if (id === null) notFound();

    if (!isTmdbConfigured()) {
        await connection();
        return <SetupNotice />;
    }

    const show = await getShow(id);
    if (!show) notFound();

    const seasons = ratedSeasons(show.seasons);
    const ended = !show.inProduction;
    const trend = analyzeSeasons(show.seasons, { ended });
    const firstYear = year(show.firstAirDate);
    const lastYear = ended ? year(show.lastAirDate) : null;

    return (
        <article className={css.show}>
            <header className={css.header}>
                {show.posterPath && (
                    <Image
                        className={css.poster}
                        src={posterUrl(show.posterPath, 342)}
                        alt={`${show.name} poster`}
                        width={160}
                        height={240}
                        priority
                    />
                )}
                <div>
                    <h1>{show.name}</h1>
                    <p className={css.meta}>
                        {firstYear}
                        {lastYear && lastYear !== firstYear && `–${lastYear}`}
                        {!ended && '–'} · {show.status} · {seasons.length} rated{' '}
                        {seasons.length === 1 ? 'season' : 'seasons'}
                    </p>
                    {trend && <p className={css.verdict}>{trend.verdict}</p>}
                    {show.overview && (
                        <p className={css.overview}>{show.overview}</p>
                    )}
                </div>
            </header>

            {trend ? (
                <>
                    <div className={css.stats}>
                        <StatTile
                            label="Best season"
                            value={formatRating(trend.best.rating)}
                            detail={`Season ${trend.best.seasonNumber}${trend.best.airDate ? ` (${year(trend.best.airDate)})` : ''}`}
                        />
                        <StatTile
                            label="Worst season"
                            value={formatRating(trend.worst.rating)}
                            detail={`Season ${trend.worst.seasonNumber}${trend.worst.airDate ? ` (${year(trend.worst.airDate)})` : ''}`}
                        />
                        <StatTile
                            label="First to last season"
                            value={formatChange(trend.change)}
                            detail={`S${trend.first.seasonNumber} ${formatRating(trend.first.rating)} → S${trend.last.seasonNumber} ${formatRating(trend.last.rating)}`}
                            tone={
                                trend.change >= 0.05
                                    ? 'up'
                                    : trend.change <= -0.05
                                      ? 'down'
                                      : undefined
                            }
                        />
                        <StatTile
                            label="Show rating on TMDB"
                            value={formatRating(show.voteAverage)}
                            detail={`${show.voteCount.toLocaleString('en')} votes`}
                        />
                    </div>

                    <section className={css.section}>
                        <h2>Average episode rating per season</h2>
                        <SeasonChart seasons={seasons} />
                    </section>
                </>
            ) : (
                <p className={css.empty}>
                    This series needs at least two seasons with rated episodes
                    to show a trend.
                </p>
            )}

            <section className={css.section}>
                <h2>Season by season</h2>
                <SeasonTable seasons={show.seasons} trend={trend} />
            </section>
        </article>
    );
}

export default function Page({ params }: PageProps<'/shows/[id]'>) {
    return (
        <Suspense fallback={<div className={css.loading}>Loading series…</div>}>
            <ShowDetails params={params} />
        </Suspense>
    );
}
