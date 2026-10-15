import type { Person } from '@/lib/types';
import { personCardProps } from './PersonCard';
import { TrendGrid } from './TrendGrid';

type PersonGridProps = {
    people: { person: Person; meta?: string }[];
};

export function PersonGrid({ people }: PersonGridProps) {
    return (
        <TrendGrid
            cards={people.map(({ person, meta }) =>
                personCardProps(person, meta)
            )}
        />
    );
}
