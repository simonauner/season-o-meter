'use client';

import { useState } from 'react';
import { isCounted } from '@/lib/people';
import type { Credit } from '@/lib/types';
import { ChoicePicker } from './ChoicePicker';
import { MovieChart } from './MovieChart';
import css from './careerChart.module.css';

/**
 * Someone's movies that count, with a switch to add their cameos, which
 * visitors may know them from but which say little about their career.
 */
export function CareerChart({ movies }: { movies: Credit[] }) {
    const [withCameos, setWithCameos] = useState(false);
    const cameos = movies.filter((movie) => !isCounted(movie)).length;

    return (
        <>
            {cameos > 0 && (
                <div className={css.picker}>
                    <ChoicePicker
                        label="Cameos"
                        options={[
                            { value: false, label: 'Left out' },
                            { value: true, label: `Shown (${cameos})` },
                        ]}
                        current={withCameos}
                        onChange={setWithCameos}
                    />
                </div>
            )}
            <MovieChart
                movies={withCameos ? movies : movies.filter(isCounted)}
                note={(movie) => (isCounted(movie) ? undefined : 'Cameo')}
            />
        </>
    );
}
