import type { Franchise } from '@/lib/types';
import { FranchiseCard } from './FranchiseCard';
import css from './cardGrid.module.css';

export function FranchiseGrid({ franchises }: { franchises: Franchise[] }) {
    return (
        <ul className={css.grid}>
            {franchises.map((franchise) => (
                <li key={franchise.id}>
                    <FranchiseCard franchise={franchise} />
                </li>
            ))}
        </ul>
    );
}
