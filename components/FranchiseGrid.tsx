import type { Franchise } from '@/lib/types';
import { varyVerdicts } from '@/lib/verdicts';
import { franchiseCardProps } from './FranchiseCard';
import { TrendCard } from './TrendCard';
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
            {varyVerdicts(franchises.map(franchiseCardProps)).map((card) => (
                <li key={card.id}>
                    <TrendCard
                        {...card}
                        verdict={hideVerdicts ? undefined : card.verdict}
                    />
                </li>
            ))}
        </ul>
    );
}
