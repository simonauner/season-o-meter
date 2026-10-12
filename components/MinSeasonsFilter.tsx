'use client';

import type { ReactNode } from 'react';
import {
    DEFAULT_MIN_SEASONS,
    MIN_SEASONS_OPTIONS,
    type MinSeasons,
} from '@/lib/minSeasons';
import { storedChoice } from '@/lib/storedChoice';
import { ChoicePicker } from './ChoicePicker';

const minSeasons = storedChoice(
    'season-o-meter:min-seasons',
    MIN_SEASONS_OPTIONS,
    DEFAULT_MIN_SEASONS
);

export const useMinSeasons = minSeasons.useChoice;

const OPTIONS = MIN_SEASONS_OPTIONS.map((value) => ({ value, label: value }));

export function MinSeasonsPicker() {
    return (
        <ChoicePicker
            label="Series with at least"
            suffix="seasons"
            options={OPTIONS}
            current={minSeasons.useStoredChoice()}
            onChange={minSeasons.set}
        />
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
