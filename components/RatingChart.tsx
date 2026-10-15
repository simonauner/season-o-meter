'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatRating } from '@/lib/format';
import { valueOf } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import css from './ratingChart.module.css';

export type ChartPoint = {
    key: string | number;
    /** Short x-axis label, like "S3" or "1980". */
    axisLabel: string;
    rating: number;
    /** Tooltip heading, like "Season 3 · 2015". */
    title: string;
    /** Tooltip detail, like "10 rated episodes · +0.3 vs S2". */
    detail: string;
};

type RatingChartProps = {
    points: ChartPoint[];
    /** Accessible name, including how to use the keyboard. */
    label: string;
    /** Where the visitor's own rating of each point is stored, if anywhere. */
    ownKeys?: string[];
};

const HEIGHT = 300;
const MARGIN = { top: 28, right: 20, bottom: 40, left: 40 };
/** Half the tooltip's max width, to keep it inside the chart. */
const TOOLTIP_HALF_WIDTH = 110;

/** A rating domain that hugs the data, so changes between points are visible. */
const ratingDomain = (ratings: number[]): [number, number] => {
    let min = Math.max(0, Math.floor(Math.min(...ratings) - 0.3));
    let max = Math.min(10, Math.ceil(Math.max(...ratings) + 0.3));
    while (max - min < 2) {
        if (min > 0) min--;
        else max++;
    }
    return [min, max];
};

const ticks = ([min, max]: [number, number]) => {
    const step = max - min <= 3 ? 0.5 : 1;
    const result: number[] = [];
    for (let value = min; value <= max + 1e-9; value += step) {
        result.push(value);
    }
    return result;
};

/** A path through the rated points that breaks where a point isn't rated. */
const gappedPath = (
    values: (number | null)[],
    x: (index: number) => number,
    y: (rating: number) => number
) =>
    values
        .map((value, i) =>
            value === null
                ? ''
                : `${values[i - 1] == null ? 'M' : 'L'}${x(i)},${y(value)}`
        )
        .join('');

export function RatingChart({ points, label, ownKeys }: RatingChartProps) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(720);
    const [active, setActive] = useState<number | null>(null);
    const userData = useUserData();

    useEffect(() => {
        const element = wrapperRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            setWidth(Math.round(entry.contentRect.width));
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const ratings = points.map((point) => point.rating);
    const own = points.map((_, i) =>
        userData && ownKeys ? valueOf(userData, ownKeys[i]) : null
    );
    const ownRatings = own.filter((rating) => rating !== null);
    const domain = ratingDomain([...ratings, ...ownRatings]);
    const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    // Point scale with half a step of padding on each side.
    const step = innerWidth / points.length;
    const x = (index: number) => MARGIN.left + step * (index + 0.5);
    const y = (rating: number) =>
        MARGIN.top +
        ((domain[1] - rating) / (domain[1] - domain[0])) * innerHeight;

    const line = points.map((p, i) => `${x(i)},${y(p.rating)}`).join(' ');
    const baseline = MARGIN.top + innerHeight;

    // Only label the extremes directly; the tooltip and table carry the rest.
    const bestIndex = ratings.indexOf(Math.max(...ratings));
    const worstIndex = ratings.indexOf(Math.min(...ratings));

    // Thin out x labels when there are many points.
    const labelEvery = Math.ceil(points.length / Math.max(innerWidth / 36, 1));

    const indexAt = (clientX: number) => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const index = Math.floor((clientX - rect.left - MARGIN.left) / step);
        return Math.min(Math.max(index, 0), points.length - 1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const current = active ?? 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            setActive(Math.min(current + 1, points.length - 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            setActive(Math.max(current - 1, 0));
        } else if (event.key === 'Home') {
            setActive(0);
        } else if (event.key === 'End') {
            setActive(points.length - 1);
        } else if (event.key === 'Escape') {
            setActive(null);
        } else {
            return;
        }
        event.preventDefault();
    };

    const activePoint = active === null ? null : points[active];

    return (
        <>
            {ownRatings.length > 0 && (
                <p className={css.legend} aria-hidden="true">
                    <span className={css.legendImdb}>IMDb</span>
                    <span className={css.legendOwn}>You</span>
                </p>
            )}
            <div
                ref={wrapperRef}
                className={css.wrapper}
                tabIndex={0}
                role="group"
                aria-label={label}
                onPointerMove={(event) => setActive(indexAt(event.clientX))}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive((current) => current ?? 0)}
                onBlur={() => setActive(null)}
                onKeyDown={onKeyDown}
            >
                <svg
                    width={width}
                    height={HEIGHT}
                    className={css.svg}
                    aria-hidden="true"
                >
                    {ticks(domain).map((tick) => (
                        <g key={tick}>
                            <line
                                x1={MARGIN.left}
                                x2={width - MARGIN.right}
                                y1={y(tick)}
                                y2={y(tick)}
                                className={css.grid}
                            />
                            <text
                                x={MARGIN.left - 8}
                                y={y(tick)}
                                className={css.axisLabel}
                                textAnchor="end"
                                dominantBaseline="middle"
                            >
                                {Number.isInteger(tick)
                                    ? tick
                                    : tick.toFixed(1)}
                            </text>
                        </g>
                    ))}

                    {points.map((point, i) =>
                        // The last label always, and the regular ones that
                        // aren't so close to it that they'd overlap.
                        i === points.length - 1 ||
                        (i % labelEvery === 0 &&
                            points.length - 1 - i >= labelEvery) ? (
                            <text
                                key={point.key}
                                x={x(i)}
                                y={baseline + 20}
                                className={css.axisLabel}
                                textAnchor="middle"
                            >
                                {point.axisLabel}
                            </text>
                        ) : null
                    )}

                    {activePoint && active !== null && (
                        <line
                            x1={x(active)}
                            x2={x(active)}
                            y1={MARGIN.top}
                            y2={baseline}
                            className={css.crosshair}
                        />
                    )}

                    <polygon
                        points={`${x(0)},${baseline} ${line} ${x(points.length - 1)},${baseline}`}
                        className={css.area}
                    />
                    <polyline points={line} className={css.line} />
                    <path d={gappedPath(own, x, y)} className={css.ownLine} />

                    {points.map((point, i) =>
                        // With many points, only mark the ones that matter.
                        step >= 16 ||
                        i === active ||
                        i === bestIndex ||
                        i === worstIndex ||
                        i === points.length - 1 ? (
                            <circle
                                key={point.key}
                                cx={x(i)}
                                cy={y(point.rating)}
                                r={i === active ? 6 : 4}
                                className={css.point}
                            />
                        ) : null
                    )}

                    {own.map((rating, i) =>
                        rating === null ? null : (
                            <circle
                                key={points[i].key}
                                cx={x(i)}
                                cy={y(rating)}
                                r={i === active ? 5 : 3.5}
                                className={css.ownPoint}
                            />
                        )
                    )}

                    {[bestIndex, worstIndex]
                        .filter((i, n, all) => all.indexOf(i) === n)
                        .map((i) => (
                            <text
                                key={i}
                                x={x(i)}
                                y={
                                    i === bestIndex ||
                                    y(points[i].rating) + 24 > baseline
                                        ? y(points[i].rating) - 12
                                        : y(points[i].rating) + 20
                                }
                                className={css.valueLabel}
                                textAnchor="middle"
                            >
                                {formatRating(points[i].rating)}
                            </text>
                        ))}
                </svg>

                {activePoint && active !== null && (
                    <div
                        className={css.tooltip}
                        style={{
                            left: Math.min(
                                Math.max(x(active), TOOLTIP_HALF_WIDTH),
                                Math.max(
                                    width - TOOLTIP_HALF_WIDTH,
                                    TOOLTIP_HALF_WIDTH
                                )
                            ),
                            // Flip below the point when there's no room above it.
                            ...(y(activePoint.rating) < 100
                                ? {
                                      top: y(activePoint.rating) + 14,
                                      transform: 'translate(-50%, 0)',
                                  }
                                : { top: y(activePoint.rating) - 14 }),
                        }}
                        role="status"
                    >
                        <strong className={css.tooltipValue}>
                            {formatRating(activePoint.rating)}
                        </strong>
                        <span>{activePoint.title}</span>
                        <span>{activePoint.detail}</span>
                        {own[active] !== null && (
                            <span className={css.tooltipOwn}>
                                Your rating: {own[active]}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
