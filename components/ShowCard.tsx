import Link from 'next/link';
import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import {
    changeTone,
    formatChange,
    formatRating,
    formatVotes,
    formatYears,
} from '@/lib/format';
import type { Show } from '@/lib/types';
import { Sparkline } from './Sparkline';
import css from './showCard.module.css';

export function ShowCard({ show }: { show: Show }) {
    const seasons = ratedSeasons(show.seasons);
    const trend = analyzeSeasons(show);

    return (
        <Link href={`/shows/${show.id}/`} className={css.card}>
            <div>
                <h3 className={css.title}>{show.title}</h3>
                <p className={css.meta}>
                    {formatYears(show)} · {seasons.length} seasons ·{' '}
                    {formatVotes(show.votes)} votes
                </p>
                {trend && <p className={css.verdict}>{trend.verdict}</p>}
            </div>
            <div className={css.chart}>
                <Sparkline ratings={seasons.map((season) => season.rating)} />
                {trend && (
                    <p className={css.change}>
                        <span>
                            S{trend.first.seasonNumber}{' '}
                            <strong>{formatRating(trend.first.rating)}</strong>
                        </span>
                        <span className={css[changeTone(trend.change) ?? '']}>
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
