import { analyzeSeasons, ratedSeasons } from '@/lib/analysis';
import { formatRating, formatVotes, formatYears } from '@/lib/format';
import type { Show } from '@/lib/types';
import { Poster } from './Poster';
import { PosterLink, PosterScope, SharedPoster } from './PosterTransition';
import { SeasonChart } from './SeasonChart';
import css from './hero.module.css';

/** How wide the poster is shown, as in hero.module.css. */
const POSTER_SIZES = '(max-width: 760px) 96px, 150px';

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
        <PosterScope>
            <div className={css.body}>
                {/* The title links to the same page, for keyboards and screen readers. */}
                <PosterLink
                    href={href}
                    className={css.poster}
                    tabIndex={-1}
                    aria-hidden
                >
                    <SharedPoster id={show.id}>
                        <div className={css.posterImage}>
                            <Poster
                                entry={{
                                    type: 'series',
                                    id: show.id,
                                    title: show.title,
                                    startYear: show.startYear,
                                    endYear: show.endYear,
                                    ratings: seasons.map(
                                        (season) => season.rating
                                    ),
                                    poster: show.poster,
                                }}
                                sizes={POSTER_SIZES}
                                untitled
                            />
                        </div>
                    </SharedPoster>
                </PosterLink>
                <div className={css.heading}>
                    <p className={css.eyebrow}>{eyebrow}</p>
                    <h2 className={css.title}>
                        <PosterLink href={href}>{show.title}</PosterLink>
                    </h2>
                    <p className={css.meta}>
                        {formatYears(show)} · {seasons.length} seasons ·{' '}
                        {formatVotes(show.votes)} votes
                    </p>
                    {trend && <p className={css.verdict}>{trend.verdict}</p>}
                </div>
                <div className={css.details}>
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
                    <PosterLink href={href} className={css.more}>
                        See every season
                        <span className="visually-hidden">
                            : {show.title}
                        </span>{' '}
                        →
                    </PosterLink>
                </div>
                {seasons.length >= 2 && (
                    <div className={css.chart}>
                        <SeasonChart showId={show.id} seasons={seasons} />
                    </div>
                )}
            </div>
        </PosterScope>
    );
}
