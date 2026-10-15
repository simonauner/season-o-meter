import type { Show } from '@/lib/types';
import { showCardProps } from './ShowCard';
import { TrendGrid } from './TrendGrid';

type ShowGridProps = {
    shows: Show[];
    hideVerdicts?: boolean;
};

export function ShowGrid({ shows, hideVerdicts }: ShowGridProps) {
    return (
        <TrendGrid
            cards={shows.map(showCardProps)}
            hideVerdicts={hideVerdicts}
        />
    );
}
