import type { SearchEntry } from './searchIndex';
import { mean } from './stats';
import type { UserData } from './userData';
import { listItems, partAverage, partCount, type ListItem } from './userList';

/** Someone's rating of a series or film series. */
export type Score = {
    value: number;
    /** Set when it's the average of season or movie ratings. */
    parts?: { rated: number; total: number };
};

export type CompareRow = {
    entry: SearchEntry;
    /** One per person, in the order the lists were given. */
    scores: (Score | null)[];
    /** The average of everyone's scores who has one. */
    average: number;
};

/** The overall rating, or else the average of the seasons or movies rated. */
function scoreOf(item: ListItem): Score | null {
    if (item.rating !== null) return { value: item.rating };
    const average = partAverage(item);
    if (average === null) return null;
    return {
        value: average,
        parts: { rated: item.partRatings.length, total: partCount(item) },
    };
}

/** Every series or film series that anyone in `lists` has rated. */
export function compareRows(
    lists: UserData[],
    index: SearchEntry[],
    type: SearchEntry['type']
): CompareRow[] {
    const ofType = index.filter((entry) => entry.type === type);
    const rows = new Map<string, CompareRow>();
    lists.forEach((data, person) => {
        for (const item of listItems(data, ofType)) {
            const score = scoreOf(item);
            if (!score) continue;
            let row = rows.get(item.entry.id);
            if (!row) {
                row = {
                    entry: item.entry,
                    scores: lists.map(() => null),
                    average: 0,
                };
                rows.set(item.entry.id, row);
            }
            row.scores[person] = score;
        }
    });
    for (const row of rows.values()) {
        row.average = mean(
            row.scores.flatMap((score) => (score ? [score.value] : []))
        );
    }
    return [...rows.values()];
}

/** Which column to sort by: a person's index, or everyone's average. */
export type SortColumn = number | 'average';

/** Sorted by a column. Rows without a score there come last either way. */
export function sortRows(
    rows: CompareRow[],
    column: SortColumn,
    descending: boolean
) {
    const valueOf = (row: CompareRow) =>
        column === 'average' ? row.average : row.scores[column]?.value;
    return [...rows].sort((a, b) => {
        const x = valueOf(a);
        const y = valueOf(b);
        if (x === undefined || y === undefined) {
            if (x !== y) return x === undefined ? 1 : -1;
        } else if (x !== y) {
            return descending ? y - x : x - y;
        }
        return a.entry.title.localeCompare(b.entry.title);
    });
}
