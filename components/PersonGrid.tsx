import type { Person } from '@/lib/types';
import { varyVerdicts } from '@/lib/verdicts';
import { personCardProps } from './PersonCard';
import { TrendCard } from './TrendCard';
import css from './cardGrid.module.css';

type PersonGridProps = {
    people: { person: Person; meta?: string }[];
};

export function PersonGrid({ people }: PersonGridProps) {
    const cards = varyVerdicts(
        people.map(({ person, meta }) => personCardProps(person, meta))
    );
    return (
        <ul className={css.grid}>
            {cards.map((card) => (
                <li key={card.id}>
                    <TrendCard {...card} />
                </li>
            ))}
        </ul>
    );
}
