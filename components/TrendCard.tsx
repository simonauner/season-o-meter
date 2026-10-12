import Link from 'next/link';
import { changeTone, formatChange, formatRating } from '@/lib/format';
import { Sparkline } from './Sparkline';
import css from './trendCard.module.css';

type Endpoint = {
    /** Short label, like "S1" or "1977". */
    label: string;
    rating: number;
};

export type TrendCardProps = {
    href: string;
    title: string;
    meta: string;
    verdict?: string;
    ratings: number[];
    /** The first and last rating, when there's a trend to show. */
    trend: { first: Endpoint; last: Endpoint; change: number } | null;
};

export function TrendCard({
    href,
    title,
    meta,
    verdict,
    ratings,
    trend,
}: TrendCardProps) {
    return (
        <Link href={href} className={css.card}>
            <div>
                <h3 className={css.title}>{title}</h3>
                <p className={css.meta}>{meta}</p>
                {verdict && <p className={css.verdict}>{verdict}</p>}
            </div>
            <div className={css.chart}>
                <Sparkline ratings={ratings} />
                {trend && (
                    <p className={css.change}>
                        <span>
                            {trend.first.label}{' '}
                            <strong>{formatRating(trend.first.rating)}</strong>
                        </span>
                        <span className={css[changeTone(trend.change) ?? '']}>
                            {formatChange(trend.change)}
                        </span>
                        <span>
                            {trend.last.label}{' '}
                            <strong>{formatRating(trend.last.rating)}</strong>
                        </span>
                    </p>
                )}
            </div>
        </Link>
    );
}
