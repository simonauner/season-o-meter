import type { Franchise } from '@/lib/types';
import { FranchiseCard } from './FranchiseCard';
import css from './cardGrid.module.css';

type FranchiseGridProps = {
    franchises: Franchise[];
    hideVerdicts?: boolean;
};

export function FranchiseGrid({
    franchises,
    hideVerdicts,
}: FranchiseGridProps) {
    return (
        <ul className={css.grid}>
            {franchises.map((franchise) => (
                <li key={franchise.id}>
                    <FranchiseCard
                        franchise={franchise}
                        hideVerdict={hideVerdicts}
                    />
                </li>
            ))}
        </ul>
    );
}
