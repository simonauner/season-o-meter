import { changeTone, formatChange, formatRating } from '@/lib/format';
import { Poster, type PosterEntry } from './Poster';
import { PosterLink, PosterScope, SharedPoster } from './PosterTransition';
import { Sparkline, type SparklineScale } from './Sparkline';
import { CardRating } from './YourRating';
import css from './trendCard.module.css';

type Endpoint = {
    /** Short label, like "S1" or "1977". */
    label: string;
    rating: number;
};

export type TrendCardProps = Omit<PosterEntry, 'ratings'> & {
    href: string;
    meta: string;
    verdict?: string;
    /**
     * Every way of saying the verdict, for a list to pick one that no card
     * before has.
     */
    verdicts?: string[];
    ratings: number[];
    /** The first and last rating, when there's a trend to show. */
    trend: { first: Endpoint; last: Endpoint; change: number } | null;
    /** The rating to show instead, when there's only one. */
    single?: Endpoint;
    /** Shared with the other cards in its grid. */
    scale?: SparklineScale;
};

export function TrendCard({
    href,
    meta,
    verdict,
    trend,
    single,
    scale,
    ...entry
}: TrendCardProps) {
    return (
        <PosterScope>
            <PosterLink href={href} className={css.card}>
                <div className={css.top}>
                    <SharedPoster id={entry.id}>
                        <div className={css.poster}>
                            <Poster entry={entry} sizes="56px" untitled />
                        </div>
                    </SharedPoster>
                    <div>
                        <h3 className={css.title}>{entry.title}</h3>
                        <p className={css.meta}>{meta}</p>
                        {verdict && <p className={css.verdict}>{verdict}</p>}
                    </div>
                    <CardRating id={entry.id} className={css.yours} />
                </div>
                <div className={css.chart}>
                    <Sparkline ratings={entry.ratings} scale={scale} />
                    {!trend && single && (
                        <p className={css.change}>
                            <span>
                                {single.label}{' '}
                                <strong>{formatRating(single.rating)}</strong>
                            </span>
                        </p>
                    )}
                    {trend && (
                        <p className={css.change}>
                            <span>
                                {trend.first.label}{' '}
                                <strong>
                                    {formatRating(trend.first.rating)}
                                </strong>
                            </span>
                            <span
                                className={css[changeTone(trend.change) ?? '']}
                            >
                                {formatChange(trend.change)}
                            </span>
                            <span>
                                {trend.last.label}{' '}
                                <strong>
                                    {formatRating(trend.last.rating)}
                                </strong>
                            </span>
                        </p>
                    )}
                </div>
            </PosterLink>
        </PosterScope>
    );
}
