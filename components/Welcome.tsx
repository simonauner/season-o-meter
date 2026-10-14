'use client';

import { Bookmark, Heart, Star, Users, X } from 'lucide-react';
import Link from 'next/link';
import {
    type AnimationEvent,
    type CSSProperties,
    type ReactNode,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { formatRating } from '@/lib/format';
import { markTipSeen, useTip } from '@/lib/tips';
import { valueOf, watchlistKey } from '@/lib/userData';
import { setValue, useUserData } from '@/lib/userStore';
import { Poster, type PosterEntry } from './Poster';
import css from './welcome.module.css';

/** A series that peaked and went downhill, drawn in the welcome. */
export type PeakExample = {
    title: string;
    href: string;
    seasons: { seasonNumber: number; rating: number }[];
};

/**
 * The top of the front page: a welcome for new visitors, and once they've
 * closed it, the featured series and the page's heading. The welcome is
 * swiped away like a card in Swipe, leaving the heading, and the featured
 * series is there from the next visit on. Closing it counts as a tip, so it
 * comes back with the others from Profile.
 */
export function HomeTop({
    hero,
    intro,
    example,
    picks,
}: {
    hero: ReactNode;
    /** The page's heading, which the welcome has in its place. */
    intro: ReactNode;
    example?: PeakExample;
    /** Series to start a watchlist with, right in the welcome. */
    picks: PosterEntry[];
}) {
    // Null until read in the browser, when the pre-rendered page has the
    // featured series and heading.
    const welcome = useTip('home-welcome') === true;
    /** The welcome's height while it's swiped away, which the top goes from. */
    const [leaving, setLeaving] = useState<number | null>(null);
    /** Whether it was closed on this visit, which then goes without a hero. */
    const [closed, setClosed] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);
    const introRef = useRef<HTMLDivElement>(null);

    // Focus would otherwise be lost with the button that closed it.
    useEffect(() => {
        if (closed) introRef.current?.focus({ preventScroll: true });
    }, [closed]);

    // Shrinks away while the welcome flies out to the side.
    useLayoutEffect(() => {
        const stage = stageRef.current;
        if (leaving === null || !stage) return;
        stage.style.height = `${leaving}px`;
        // Applies the starting height before the transition to none.
        stage.getBoundingClientRect();
        stage.style.height = '0px';
        // The welcome would otherwise widen the page on its way out.
        const root = document.documentElement;
        const overflowX = root.style.overflowX;
        root.style.overflowX = 'clip';
        return () => {
            stage.style.height = '';
            root.style.overflowX = overflowX;
        };
    }, [leaving]);

    const close = () => {
        const stage = stageRef.current;
        if (!stage || matchMedia('(prefers-reduced-motion: reduce)').matches) {
            done();
            return;
        }
        setLeaving(stage.offsetHeight);
    };

    const done = () => {
        markTipSeen('home-welcome');
        setClosed(true);
        setLeaving(null);
    };

    const onAnimationEnd = (event: AnimationEvent) => {
        if (leaving !== null && event.target === event.currentTarget) done();
    };

    return (
        <>
            <div ref={stageRef} className={css.stage}>
                {welcome && (
                    <Welcome
                        example={example}
                        picks={picks}
                        leaving={leaving !== null}
                        onClose={close}
                        onAnimationEnd={onAnimationEnd}
                    />
                )}
            </div>
            {!welcome && !closed && hero}
            {(!welcome || leaving !== null) && (
                <div
                    ref={introRef}
                    tabIndex={-1}
                    className={leaving !== null ? css.introArriving : css.intro}
                >
                    {intro}
                </div>
            )}
        </>
    );
}

const FEATURES = [
    {
        icon: Star,
        title: 'Rate what you’ve seen',
        text: 'Rate a series or each of its seasons, and see your ratings next to IMDb’s.',
    },
    {
        icon: Bookmark,
        title: 'Keep a watchlist',
        text: 'Save what to watch next, no account needed. Start with one of the best:',
        href: '/mine/',
        withPicks: true,
    },
    {
        icon: Users,
        title: 'Compare with friends',
        text: 'Add friends from their links and see everyone’s ratings side by side.',
        href: '/friends/',
    },
    {
        icon: Heart,
        title: 'Date a series',
        text: 'Swipe right on series you’d watch and left on the rest. Like a dating app, but for TV.',
        href: '/swipe/',
    },
];

function Welcome({
    example,
    picks,
    leaving,
    onClose,
    onAnimationEnd,
}: {
    example?: PeakExample;
    picks: PosterEntry[];
    leaving: boolean;
    onClose: () => void;
    onAnimationEnd: (event: AnimationEvent) => void;
}) {
    const headingId = useId();

    return (
        <section
            className={css.welcome}
            aria-labelledby={headingId}
            data-leaving={leaving || undefined}
            inert={leaving}
            onAnimationEnd={onAnimationEnd}
        >
            <button
                type="button"
                className={css.close}
                aria-label="Close the welcome"
                title="Close"
                onClick={onClose}
            >
                <X size={20} aria-hidden="true" />
            </button>
            <div className={css.top}>
                <div className={css.text}>
                    <p className={css.eyebrow}>Welcome to Season-o-meter</p>
                    <h1 id={headingId} className={css.heading}>
                        Where did it <span className={css.peakWord}>peak</span>?
                    </h1>
                    <p className={css.lede}>
                        How TV series are rated season by season, and where they
                        went downhill.
                    </p>
                </div>
                {example && <PeakChart example={example} />}
            </div>
            <ul className={css.features}>
                {FEATURES.map(
                    ({ icon: Icon, title, text, href, withPicks }, i) => {
                        const content = (
                            <>
                                <span className={css.icon}>
                                    <Icon size={18} aria-hidden="true" />
                                </span>
                                <span className={css.featureTitle}>
                                    {title}
                                </span>
                                <span className={css.featureText}>{text}</span>
                            </>
                        );
                        const to = href ?? example?.href;
                        return (
                            <li
                                key={title}
                                style={{ '--i': i } as CSSProperties}
                            >
                                {withPicks && picks.length > 0 ? (
                                    <div className={css.feature}>
                                        {content}
                                        <WatchlistPicks picks={picks} />
                                    </div>
                                ) : to ? (
                                    <Link href={to} className={css.feature}>
                                        {content}
                                    </Link>
                                ) : (
                                    <div className={css.feature}>{content}</div>
                                )}
                            </li>
                        );
                    }
                )}
            </ul>
        </section>
    );
}

/**
 * A few series to put on the watchlist with a tap, so it doesn't start out
 * empty, and a way to it once something is on it.
 */
function WatchlistPicks({ picks }: { picks: PosterEntry[] }) {
    const data = useUserData();
    const saved = picks.filter(
        (pick) => data && valueOf(data, watchlistKey(pick.id)) === 1
    ).length;

    return (
        <div className={css.picks}>
            <ul className={css.pickList}>
                {picks.map((pick) => {
                    const key = watchlistKey(pick.id);
                    const on = data !== null && valueOf(data, key) === 1;
                    return (
                        <li key={pick.id}>
                            <button
                                type="button"
                                className={css.pick}
                                aria-pressed={on}
                                aria-label={`Watchlist: ${pick.title}`}
                                title={pick.title}
                                disabled={data === null}
                                onClick={() => setValue(key, on ? null : 1)}
                            >
                                <Poster entry={pick} sizes="64px" untitled />
                                <span className={css.pickBadge} aria-hidden>
                                    {on ? '✓' : '+'}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
            {saved > 0 && (
                <Link href="/mine/" className={css.pickLink}>
                    {saved === 1 ? 'Saved' : `${saved} saved`}. See your list →
                </Link>
            )}
        </div>
    );
}

/** The chart's size in its own units. */
const WIDTH = 320;
const HEIGHT = 170;
/** Room around the line for the dots and labels. */
const PAD = { top: 38, right: 8, bottom: 26, left: 8 };

/**
 * The line through each season of a series that peaked and went downhill,
 * drawn from left to right, with the peak and the lowest season after it
 * marked.
 */
function PeakChart({ example }: { example: PeakExample }) {
    const { title, href, seasons } = example;
    const ratings = seasons.map((season) => season.rating);
    const peak = ratings.indexOf(Math.max(...ratings));
    const afterPeak = ratings.slice(peak + 1);
    const low = afterPeak.length
        ? peak + 1 + afterPeak.indexOf(Math.min(...afterPeak))
        : null;

    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const x = (i: number) =>
        PAD.left +
        ((WIDTH - PAD.left - PAD.right) * i) / Math.max(1, seasons.length - 1);
    const y = (rating: number) =>
        PAD.top +
        ((HEIGHT - PAD.top - PAD.bottom) * (max - rating)) /
            Math.max(0.1, max - min);
    const points = ratings.map((rating, i) => `${x(i)},${y(rating)}`);
    const line = `M ${points.join(' L ')}`;
    const area = `${line} L ${x(seasons.length - 1)},${HEIGHT} L ${x(0)},${HEIGHT} Z`;

    // Inside the chart at either end, centred elsewhere.
    const anchorAt = (i: number) =>
        i === 0 ? 'start' : i === seasons.length - 1 ? 'end' : 'middle';
    const label = (i: number) =>
        `S${seasons[i].seasonNumber} · ${formatRating(ratings[i])}`;
    const delay = { '--n': seasons.length } as CSSProperties;

    return (
        <figure className={css.chart}>
            <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className={css.chartSvg}
                role="img"
                aria-label={`${title}: ${seasons.map((_, i) => label(i)).join(', ')}`}
            >
                <path className={css.area} d={area} style={delay} />
                <path
                    className={css.line}
                    d={line}
                    pathLength={1}
                    style={delay}
                />
                {ratings.map((rating, i) => (
                    <circle
                        key={i}
                        className={
                            i === peak
                                ? css.peakPoint
                                : i === low
                                  ? css.lowPoint
                                  : css.point
                        }
                        style={{ '--i': i } as CSSProperties}
                        cx={x(i)}
                        cy={y(rating)}
                        r={i === peak || i === low ? 5.5 : 4}
                    />
                ))}
                <g className={css.peakLabel} style={delay}>
                    <text
                        x={x(peak)}
                        y={y(ratings[peak]) - 24}
                        textAnchor={anchorAt(peak)}
                        className={css.peakTag}
                    >
                        PEAK
                    </text>
                    <text
                        x={x(peak)}
                        y={y(ratings[peak]) - 12}
                        textAnchor={anchorAt(peak)}
                    >
                        {label(peak)}
                    </text>
                </g>
                {low !== null && (
                    <text
                        className={css.lowLabel}
                        style={delay}
                        x={x(low)}
                        y={y(ratings[low]) + 20}
                        textAnchor={anchorAt(low)}
                    >
                        {label(low)}
                    </text>
                )}
            </svg>
            <figcaption className={css.caption}>
                <Link href={href}>{title}</Link> peaked in season{' '}
                {seasons[peak].seasonNumber}
                {low !== null && ', and went downhill from there'}.
            </figcaption>
        </figure>
    );
}
