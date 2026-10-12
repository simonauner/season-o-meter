import type { Show } from '@/lib/types';
import { ShowCard } from './ShowCard';
import css from './showGrid.module.css';

export function ShowGrid({ shows }: { shows: Show[] }) {
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
