import type { Show } from '@/lib/types';
import { ShowCard } from './ShowCard';
import css from './cardGrid.module.css';

type ShowGridProps = {
    shows: Show[];
    hideVerdicts?: boolean;
};

export function ShowGrid({ shows, hideVerdicts }: ShowGridProps) {
    return (
        <ul className={css.grid}>
            {shows.map((show) => (
                <li key={show.id}>
                    <ShowCard show={show} hideVerdict={hideVerdicts} />
                </li>
            ))}
        </ul>
    );
}
