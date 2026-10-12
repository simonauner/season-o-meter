import Link from 'next/link';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { formatRating, formatVotes, formatYears } from '@/lib/format';
import type { Show } from '@/lib/types';
import { SeasonChart } from './SeasonChart';
import css from './hero.module.css';

/** A series given the full width at the top of the page. */
export function FeaturedShow({
    show,
    eyebrow,
}: {
    show: Show;
    /** Why it's featured, like "No. 2 in Most popular". */
    eyebrow: string;
}) {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);
    const href = `/shows/${show.id}/`;

    return (
        <div className={css.body}>
            <div className={css.text}>
                <p className={css.eyebrow}>{eyebrow}</p>
                <h2 className={css.title}>
                    <Link href={href}>{show.title}</Link>
                </h2>
                <p className={css.meta}>
                    {formatYears(show)} · {seasons.length} seasons ·{' '}
                    {formatVotes(show.votes)} votes
                </p>
                {trend && <p className={css.verdict}>{trend.verdict}</p>}
                {trend && (
                    <dl className={css.stats}>
                        <div>
                            <dt>Best season</dt>
                            <dd>
                                S{trend.best.seasonNumber}{' '}
                                <strong>
                                    {formatRating(trend.best.rating)}
                                </strong>
                            </dd>
                        </div>
                        <div>
                            <dt>Worst season</dt>
                            <dd>
                                S{trend.worst.seasonNumber}{' '}
                                <strong>
                                    {formatRating(trend.worst.rating)}
                                </strong>
                            </dd>
                        </div>
                        <div>
                            <dt>On IMDb</dt>
                            <dd>
                                <strong>{formatRating(show.rating)}</strong>
                            </dd>
                        </div>
                    </dl>
                )}
                <Link href={href} className={css.more}>
                    See every season
                    <span className="visually-hidden">: {show.title}</span> →
                </Link>
            </div>
            {seasons.length >= 2 && (
                <div className={css.chart}>
                    <SeasonChart showId={show.id} seasons={seasons} />
                </div>
            )}
        </div>
    );
}
