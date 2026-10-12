'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatChange, formatRating, year } from '@/lib/format';
import type { RatedSeason } from '@/lib/types';
import css from './seasonChart.module.css';

const HEIGHT = 300;
const MARGIN = { top: 28, right: 20, bottom: 40, left: 40 };

/** A rating domain that hugs the data, so changes between seasons are visible. */
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

export function SeasonChart({ seasons }: { seasons: RatedSeason[] }) {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(720);
    const [active, setActive] = useState<number | null>(null);

    useEffect(() => {
        const element = wrapperRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => {
            setWidth(Math.round(entry.contentRect.width));
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const ratings = seasons.map((season) => season.rating);
    const domain = ratingDomain(ratings);
    const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 1);
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    // Point scale with half a step of padding on each side.
    const step = innerWidth / seasons.length;
    const x = (index: number) => MARGIN.left + step * (index + 0.5);
    const y = (rating: number) =>
        MARGIN.top +
        ((domain[1] - rating) / (domain[1] - domain[0])) * innerHeight;

    const points = seasons.map((s, i) => `${x(i)},${y(s.rating)}`).join(' ');
    const baseline = MARGIN.top + innerHeight;

    // Only label the extremes directly; the tooltip and table carry the rest.
    const bestIndex = ratings.indexOf(Math.max(...ratings));
    const worstIndex = ratings.indexOf(Math.min(...ratings));

    // Thin out x labels when there are many seasons.
    const labelEvery = Math.ceil(seasons.length / Math.max(innerWidth / 36, 1));

    const indexAt = (clientX: number) => {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const index = Math.floor((clientX - rect.left - MARGIN.left) / step);
        return Math.min(Math.max(index, 0), seasons.length - 1);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const current = active ?? 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            setActive(Math.min(current + 1, seasons.length - 1));
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            setActive(Math.max(current - 1, 0));
        } else if (event.key === 'Home') {
            setActive(0);
        } else if (event.key === 'End') {
            setActive(seasons.length - 1);
        } else if (event.key === 'Escape') {
            setActive(null);
        } else {
            return;
        }
        event.preventDefault();
    };

    const activeSeason = active === null ? null : seasons[active];
    const previous = active ? seasons[active - 1] : null;

    return (
        <div
            ref={wrapperRef}
            className={css.wrapper}
            tabIndex={0}
            role="group"
            aria-label="Season rating chart. Use the arrow keys to step through seasons."
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
                            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                        </text>
                    </g>
                ))}

                {seasons.map((season, i) =>
                    i % labelEvery === 0 || i === seasons.length - 1 ? (
                        <text
                            key={season.seasonNumber}
                            x={x(i)}
                            y={baseline + 20}
                            className={css.axisLabel}
                            textAnchor="middle"
                        >
                            S{season.seasonNumber}
                        </text>
                    ) : null
                )}

                {activeSeason && active !== null && (
                    <line
                        x1={x(active)}
                        x2={x(active)}
                        y1={MARGIN.top}
                        y2={baseline}
                        className={css.crosshair}
                    />
                )}

                <polygon
                    points={`${x(0)},${baseline} ${points} ${x(seasons.length - 1)},${baseline}`}
                    className={css.area}
                />
                <polyline points={points} className={css.line} />

                {seasons.map((season, i) =>
                    // With many seasons, only mark the ones that matter.
                    step >= 16 ||
                    i === active ||
                    i === bestIndex ||
                    i === worstIndex ||
                    i === seasons.length - 1 ? (
                        <circle
                            key={season.seasonNumber}
                            cx={x(i)}
                            cy={y(season.rating)}
                            r={i === active ? 6 : 4}
                            className={css.point}
                        />
                    ) : null
                )}

                {[bestIndex, worstIndex]
                    .filter((i, n, all) => all.indexOf(i) === n)
                    .map((i) => (
                        <text
                            key={i}
                            x={x(i)}
                            y={
                                i === bestIndex ||
                                y(seasons[i].rating) + 24 > baseline
                                    ? y(seasons[i].rating) - 12
                                    : y(seasons[i].rating) + 20
                            }
                            className={css.valueLabel}
                            textAnchor="middle"
                        >
                            {formatRating(seasons[i].rating)}
                        </text>
                    ))}
            </svg>

            {activeSeason && active !== null && (
                <div
                    className={css.tooltip}
                    style={{
                        left: Math.min(
                            Math.max(x(active), 80),
                            Math.max(width - 80, 80)
                        ),
                        // Flip below the point when there's no room above it.
                        ...(y(activeSeason.rating) < 100
                            ? {
                                  top: y(activeSeason.rating) + 14,
                                  transform: 'translate(-50%, 0)',
                              }
                            : { top: y(activeSeason.rating) - 14 }),
                    }}
                    role="status"
                >
                    <strong className={css.tooltipValue}>
                        {formatRating(activeSeason.rating)}
                    </strong>
                    <span>
                        Season {activeSeason.seasonNumber}
                        {activeSeason.airDate &&
                            ` · ${year(activeSeason.airDate)}`}
                    </span>
                    <span>
                        {activeSeason.ratedEpisodeCount} rated episodes
                        {previous &&
                            ` · ${formatChange(activeSeason.rating - previous.rating)} vs S${previous.seasonNumber}`}
                    </span>
                </div>
            )}
        </div>
    );
}
