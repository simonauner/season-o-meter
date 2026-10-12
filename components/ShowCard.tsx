import Image from 'next/image';
import Link from 'next/link';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { formatChange, formatRating, posterUrl, year } from '@/lib/format';
import type { ShowWithSeasons } from '@/lib/types';
import { Sparkline } from './Sparkline';
import css from './showCard.module.css';

export function ShowCard({ show }: { show: ShowWithSeasons }) {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show.seasons, { ended: !show.inProduction });

    return (
        <Link href={`/shows/${show.id}`} className={css.card}>
            <div className={css.poster}>
                {show.posterPath && (
                    <Image
                        src={posterUrl(show.posterPath, 185)}
                        alt=""
                        fill
                        sizes="72px"
                    />
                )}
            </div>
            <div className={css.body}>
                <h3 className={css.title}>{show.name}</h3>
                <p className={css.meta}>
                    {year(show.firstAirDate)} · {seasons.length} seasons
                </p>
                {trend && <p className={css.verdict}>{trend.verdict}</p>}
            </div>
            <div className={css.chart}>
                <Sparkline seasons={seasons} />
                {trend && (
                    <p className={css.change}>
                        <span>
                            S{trend.first.seasonNumber}{' '}
                            <strong>{formatRating(trend.first.rating)}</strong>
                        </span>
                        <span
                            className={
                                trend.change >= 0.05
                                    ? css.up
                                    : trend.change <= -0.05
                                      ? css.down
                                      : undefined
                            }
                        >
                            {formatChange(trend.change)}
                        </span>
                        <span>
                            S{trend.last.seasonNumber}{' '}
                            <strong>{formatRating(trend.last.rating)}</strong>
                        </span>
                    </p>
                )}
            </div>
        </Link>
    );
}
