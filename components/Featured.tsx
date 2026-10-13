import type { ReactNode } from 'react';
import { Poster, type PosterEntry } from './Poster';
import { PosterLink, PosterScope, SharedPoster } from './PosterTransition';
import css from './hero.module.css';

/** How wide the poster is shown, as in hero.module.css. */
const POSTER_SIZES = '(max-width: 760px) 96px, 150px';

export type FeaturedStat = {
    label: string;
    /** What the rating belongs to, like "S2". */
    detail?: string;
    rating: string;
};

/** A series or film series given the full width at the top of the page. */
export function Featured({
    href,
    poster,
    eyebrow,
    meta,
    verdict,
    stats,
    more,
    chart,
}: {
    href: string;
    poster: PosterEntry;
    /** Why it's featured, like "No. 1 in Most popular". */
    eyebrow: string;
    meta: string;
    verdict?: string;
    stats?: FeaturedStat[] | null;
    /** The link to its page, like "See every season". */
    more: string;
    chart?: ReactNode;
}) {
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
                    <SharedPoster id={poster.id}>
                        <div className={css.posterImage}>
                            <Poster
                                entry={poster}
                                sizes={POSTER_SIZES}
                                untitled
                            />
                        </div>
                    </SharedPoster>
                </PosterLink>
                <div className={css.heading}>
                    <p className={css.eyebrow}>{eyebrow}</p>
                    <h2 className={css.title}>
                        <PosterLink href={href}>{poster.title}</PosterLink>
                    </h2>
                    <p className={css.meta}>{meta}</p>
                    {verdict && <p className={css.verdict}>{verdict}</p>}
                </div>
                <div className={css.details}>
                    {stats && (
                        <dl className={css.stats}>
                            {stats.map((stat) => (
                                <div key={stat.label}>
                                    <dt>{stat.label}</dt>
                                    <dd>
                                        {stat.detail && `${stat.detail} `}
                                        <strong>{stat.rating}</strong>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    <PosterLink href={href} className={css.more}>
                        {more}
                        <span className="visually-hidden">
                            : {poster.title}
                        </span>{' '}
                        →
                    </PosterLink>
                </div>
                {chart && <div className={css.chart}>{chart}</div>}
            </div>
        </PosterScope>
    );
}
