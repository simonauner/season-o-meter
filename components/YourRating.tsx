'use client';

import { useId } from 'react';
import {
    MAX_RATING,
    MIN_RATING,
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

/** A 1–10 scale. Choosing the current rating again clears it. */
export function RatingPicker({
    storeKey,
    label,
}: {
    storeKey: string;
    label: string;
}) {
    const { ready, value } = useValue(storeKey);
    const labelId = useId();

    return (
        <div className={css.picker} role="group" aria-labelledby={labelId}>
            <span id={labelId} className={css.label}>
                {label}
            </span>
            <span className={css.scale}>
                {RATINGS.map((rating) => (
                    <button
                        key={rating}
                        type="button"
                        className={css.step}
                        data-filled={
                            value !== null && rating <= value ? '' : undefined
                        }
                        aria-pressed={rating === value}
                        aria-label={`${rating} of ${MAX_RATING}`}
                        disabled={!ready}
                        onClick={(event) =>
                            rate(
                                storeKey,
                                rating === value ? null : rating,
                                event.currentTarget
                            )
                        }
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
            <RatingPicker storeKey={ratingKey(id)} label="Your rating" />
            <WatchlistButton id={id} />
        </div>
    );
}
