import { connection } from 'next/server';
import { ratedSeasons } from '@/lib/analysis';
import { isTmdbConfigured } from '@/lib/tmdb';
import type { ShowWithSeasons } from '@/lib/types';
import { SetupNotice } from './SetupNotice';
import { ShowCard } from './ShowCard';
import css from './showGrid.module.css';

type ShowGridProps = {
    load: () => Promise<ShowWithSeasons[]>;
    empty?: string;
};

export async function ShowGrid({ load, empty }: ShowGridProps) {
    if (!isTmdbConfigured()) {
        // Don't bake the notice into a prerendered page.
        await connection();
        return <SetupNotice />;
    }

    // Single-season shows have no curve to look at.
    const shows = (await load()).filter(
        (show) => ratedSeasons(show.seasons).length > 1
    );

    if (!shows.length) {
        return <p className={css.empty}>{empty ?? 'No series found.'}</p>;
    }

    return (
        <ul className={css.grid}>
            {shows.map((show) => (
                <li key={show.id}>
                    <ShowCard show={show} />
                </li>
            ))}
        </ul>
    );
}

export function ShowGridSkeleton() {
    return (
        <ul className={css.grid} aria-busy="true" aria-label="Loading">
            {Array.from({ length: 8 }, (_, i) => (
                <li key={i} className={css.skeleton} />
            ))}
        </ul>
    );
}
