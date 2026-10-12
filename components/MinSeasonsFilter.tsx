'use client';

import {
    type CSSProperties,
    type ReactNode,
    useId,
    useSyncExternalStore,
} from 'react';
import {
    DEFAULT_MIN_SEASONS,
    isMinSeasons,
    MIN_SEASONS_OPTIONS,
    type MinSeasons,
} from '@/lib/minSeasons';
import css from './minSeasonsFilter.module.css';

const STORAGE_KEY = 'season-o-meter:min-seasons';

const listeners = new Set<() => void>();

/** The latest choice, for when storage is blocked. */
let chosen: MinSeasons | null = null;

function subscribe(listener: () => void) {
    listeners.add(listener);
    // Keeps other open tabs in step.
    window.addEventListener('storage', listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', listener);
    };
}

function getSnapshot(): MinSeasons {
    try {
        const stored = Number(localStorage.getItem(STORAGE_KEY));
        if (isMinSeasons(stored)) return stored;
    } catch {
        // Storage can be blocked, e.g. in private windows.
    }
    return chosen ?? DEFAULT_MIN_SEASONS;
}

function setMinSeasons(minSeasons: MinSeasons) {
    chosen = minSeasons;
    try {
        localStorage.setItem(STORAGE_KEY, String(minSeasons));
    } catch {
        // The choice then only lasts until the page is reloaded.
    }
    listeners.forEach((listener) => listener());
}

/** The visitor's choice, or null until it has been read in the browser. */
const useStoredMinSeasons = () =>
    useSyncExternalStore<MinSeasons | null>(subscribe, getSnapshot, () => null);

const useMinSeasons = () => useStoredMinSeasons() ?? DEFAULT_MIN_SEASONS;

export function MinSeasonsPicker() {
    const current = useStoredMinSeasons();
    const labelId = useId();

    return (
        <div className={css.picker} role="group" aria-labelledby={labelId}>
            <span id={labelId}>Series with at least</span>
            <span
                className={css.options}
                style={
                    {
                        '--count': MIN_SEASONS_OPTIONS.length,
                    } as CSSProperties
                }
            >
                {/* Not drawn until the choice is known, so it doesn't jump. */}
                {current !== null && (
                    <span
                        className={css.indicator}
                        style={
                            {
                                '--index': MIN_SEASONS_OPTIONS.indexOf(current),
                            } as CSSProperties
                        }
                        aria-hidden
                    />
                )}
                {MIN_SEASONS_OPTIONS.map((minSeasons) => (
                    <button
                        key={minSeasons}
                        type="button"
                        className={css.option}
                        aria-pressed={minSeasons === current}
                        onClick={() => setMinSeasons(minSeasons)}
                    >
                        {minSeasons}
                    </button>
                ))}
            </span>
            <span>seasons</span>
        </div>
    );
}

/** Shows the content rendered for the visitor's chosen minimum. */
export function ByMinSeasons({
    variants,
}: {
    variants: Record<MinSeasons, ReactNode>;
}) {
    return variants[useMinSeasons()];
}
