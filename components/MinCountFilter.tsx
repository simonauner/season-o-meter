'use client';

import type { ReactNode } from 'react';
import {
    DEFAULT_MIN_COUNT,
    type Kind,
    MIN_COUNT_OPTIONS,
    type MinCount,
} from '@/lib/minCount';
import { storedChoice } from '@/lib/storedChoice';
import { ChoicePicker } from './ChoicePicker';

const minCounts = {
    series: storedChoice(
        'season-o-meter:min-seasons',
        MIN_COUNT_OPTIONS,
        DEFAULT_MIN_COUNT.series
    ),
    movies: storedChoice(
        'season-o-meter:min-movies',
        MIN_COUNT_OPTIONS,
        DEFAULT_MIN_COUNT.movies
    ),
};

const LABELS: Record<Kind, { label: string; suffix: string }> = {
    series: { label: 'Series with at least', suffix: 'seasons' },
    movies: { label: 'Film series with at least', suffix: 'movies' },
};

export const useMinCount = (kind: Kind) => minCounts[kind].useChoice();

const OPTIONS = MIN_COUNT_OPTIONS.map((value) => ({ value, label: value }));

export function MinCountPicker({ kind }: { kind: Kind }) {
    return (
        <ChoicePicker
            {...LABELS[kind]}
            options={OPTIONS}
            current={minCounts[kind].useStoredChoice()}
            onChange={minCounts[kind].set}
        />
    );
}

/** Shows the content rendered for the visitor's chosen minimum. */
export function ByMinCount({
    kind,
    variants,
}: {
    kind: Kind;
    variants: Record<MinCount, ReactNode>;
}) {
    return variants[useMinCount(kind)];
}
