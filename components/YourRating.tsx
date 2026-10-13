'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import {
    MAX_RATING,
    MIN_RATING,
    ratedIds,
    ratingKey,
    valueOf,
    watchlistKey,
} from '@/lib/userData';
import { popcorn } from '@/lib/popcorn';
import { setValue, useUserData } from '@/lib/userStore';
import css from './yourRating.module.css';

const RATINGS = Array.from(
    { length: MAX_RATING - MIN_RATING + 1 },
    (_, i) => MIN_RATING + i
);

/** The visitor's value for a key, or null until it has been read. */
function useValue(key: string) {
    const data = useUserData();
    return { ready: data !== null, value: data && valueOf(data, key) };
}

/** Saves a rating, with popcorn for a 10. */
function rate(key: string, rating: number | null, from: Element) {
    setValue(key, rating);
    if (rating === MAX_RATING) popcorn(from);
}

/**
 * Whether to run a wave across the scale, to show a visitor who hasn't rated
 * anything yet where ratings go. It starts once the scale is in view, repeats
 * after a pause, and stops for good when the visitor clicks a step.
 */
function useHint(enabled: boolean) {
    const data = useUserData();
    const ref = useRef<HTMLSpanElement>(null);
    const [state, setState] = useState<'waiting' | 'playing' | 'done'>(
        'waiting'
    );
    const unrated = enabled && data !== null && ratedIds(data).size === 0;

    useEffect(() => {
        const scale = ref.current;
        if (!unrated || state !== 'waiting' || !scale) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                observer.disconnect();
                setState('playing');
            },
            { threshold: 1 }
        );
        observer.observe(scale);
        return () => observer.disconnect();
    }, [unrated, state]);

    return {
        ref,
        playing: unrated && state === 'playing',
        stop: () => setState('done'),
    };
}

/**
 * A 1–10 scale. Choosing the current rating again clears it. With `hint`, a
 * visitor who hasn't rated anything yet is shown where the scale is.
 */
export function RatingPicker({
    storeKey,
    label,
    hint = false,
}: {
    storeKey: string;
    label: string;
    hint?: boolean;
}) {
    const { ready, value } = useValue(storeKey);
    const labelId = useId();
    const { ref, playing, stop } = useHint(hint);

    return (
        <div className={css.picker} role="group" aria-labelledby={labelId}>
            <span id={labelId} className={css.label}>
                {label}
            </span>
            <span
                ref={ref}
                className={css.scale}
                data-hint={playing ? '' : undefined}
            >
                {RATINGS.map((rating, index) => (
                    <button
                        key={rating}
                        type="button"
                        className={css.step}
                        style={{ '--index': index } as CSSProperties}
                        data-filled={
                            value !== null && rating <= value ? '' : undefined
                        }
                        aria-pressed={rating === value}
                        aria-label={`${rating} of ${MAX_RATING}`}
                        disabled={!ready}
                        onClick={(event) => {
                            stop();
                            rate(
                                storeKey,
                                rating === value ? null : rating,
                                event.currentTarget
                            );
                        }}
                    >
                        {rating}
                    </button>
                ))}
            </span>
        </div>
    );
}

/** A compact rating for a table row, like a season or a movie. */
export function RatingSelect({
    storeKey,
    label,
}: {
    storeKey: string;
    label: string;
}) {
    const { ready, value } = useValue(storeKey);

    return (
        <select
            className={css.select}
            aria-label={label}
            value={value ?? ''}
            data-set={value !== null ? '' : undefined}
            disabled={!ready}
            onChange={(event) =>
                rate(
                    storeKey,
                    event.target.value ? Number(event.target.value) : null,
                    event.currentTarget
                )
            }
        >
            <option value="">–</option>
            {RATINGS.map((rating) => (
                <option key={rating} value={rating}>
                    {rating}
                </option>
            ))}
        </select>
    );
}

export function WatchlistButton({ id }: { id: string }) {
    const key = watchlistKey(id);
    const { ready, value } = useValue(key);
    const on = value === 1;

    return (
        <button
            type="button"
            className={css.watchlist}
            aria-pressed={on}
            disabled={!ready}
            onClick={() => setValue(key, on ? null : 1)}
        >
            <span aria-hidden>{on ? '✓' : '+'}</span> Watchlist
        </button>
    );
}

/** Rating and watchlist for a series or film series as a whole. */
export function TitleActions({ id }: { id: string }) {
    return (
        <div className={css.actions}>
            <RatingPicker storeKey={ratingKey(id)} label="Your rating" hint />
            <WatchlistButton id={id} />
        </div>
    );
}

/** The visitor's rating of a title, for a card. Nothing if it isn't rated. */
export function CardRating({
    id,
    className,
}: {
    id: string;
    className?: string;
}) {
    const { value } = useValue(ratingKey(id));
    if (value === null) return null;

    return (
        <p className={className}>
            <span className="visually-hidden">Your rating: </span>
            <strong>{value}</strong>
            <span aria-hidden>You</span>
        </p>
    );
}
