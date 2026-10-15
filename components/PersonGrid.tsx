import type { Person } from '@/lib/types';
import { PersonCard } from './PersonCard';
import css from './cardGrid.module.css';

type PersonGridProps = {
    people: { person: Person; meta?: string }[];
};

export function PersonGrid({ people }: PersonGridProps) {
    return (
        <ul className={css.grid}>
            {people.map(({ person, meta }) => (
                <li key={person.id}>
                    <PersonCard person={person} meta={meta} />
                </li>
            ))}
        </ul>
    );
}
