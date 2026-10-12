import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SeasonChart } from '@/components/SeasonChart';
import { SeasonTable } from '@/components/SeasonTable';
import { StatTile } from '@/components/StatTile';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { getShow, getShows } from '@/lib/data';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
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
        description: `${show.title} rated season by season${trend ? `: ${trend.verdict.toLowerCase()}` : ''}.`,
    };
}

const seasonDetail = (season: RatedSeason) =>
    `Season ${season.seasonNumber}${season.year ? ` (${season.year})` : ''}`;

export default async function Page({ params }: PageProps<'/shows/[id]'>) {
    const show = getShow((await params).id);
    if (!show) notFound();

    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);

    return (
        <article className={css.show}>
            <header className={css.header}>
                <h1>{show.title}</h1>
                <p className={css.meta}>
                    {formatYears(show)}
                    {show.genres.length > 0 &&
                        ` · ${show.genres.join(', ')}`} ·{' '}
                    <a
                        href={`https://www.imdb.com/title/${show.id}/`}
                        rel="noreferrer"
                    >
                        IMDb
                    </a>
                </p>
                {trend && <p className={css.verdict}>{trend.verdict}</p>}
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
                        <SeasonChart seasons={seasons} />
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
                <SeasonTable seasons={show.seasons} trend={trend} />
            </section>
        </article>
    );
}
