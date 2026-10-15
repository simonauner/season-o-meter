import type { Show } from '@/lib/types';
import { varyVerdicts } from '@/lib/verdicts';
import { showCardProps } from './ShowCard';
import { TrendCard } from './TrendCard';
import css from './cardGrid.module.css';

type ShowGridProps = {
    shows: Show[];
    hideVerdicts?: boolean;
};

export function ShowGrid({ shows, hideVerdicts }: ShowGridProps) {
    return (
        <ul className={css.grid}>
            {varyVerdicts(shows.map(showCardProps)).map((card) => (
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
