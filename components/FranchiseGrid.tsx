import type { Franchise } from '@/lib/types';
import { franchiseCardProps } from './FranchiseCard';
import { TrendGrid } from './TrendGrid';

type FranchiseGridProps = {
    franchises: Franchise[];
    hideVerdicts?: boolean;
};

export function FranchiseGrid({
    franchises,
    hideVerdicts,
}: FranchiseGridProps) {
    return (
        <TrendGrid
            cards={franchises.map(franchiseCardProps)}
            hideVerdicts={hideVerdicts}
        />
    );
}
