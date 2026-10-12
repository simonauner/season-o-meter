import { ratingKey, sanitize, watchlistKey, type UserData } from './userData';

/** Parses CSV as IMDb writes it: comma-separated, quoted with "". */
export function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                quoted = false;
            } else {
                field += char;
            }
        } else if (char === '"') {
            quoted = true;
        } else if (char === ',') {
            row.push(field);
            field = '';
        } else if (char === '\n' || char === '\r') {
            if (char === '\r' && text[i + 1] === '\n') i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
        } else {
            field += char;
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows.filter((cells) => cells.some((cell) => cell !== ''));
}

const toTime = (date: string | undefined) => {
    const time = date ? Date.parse(date) : NaN;
    return Number.isNaN(time) ? Date.now() : time;
};

export type ImdbImport = {
    data: UserData;
    /** Titles in the file that could be used here. */
    matched: number;
    /** Titles in the file. */
    total: number;
};

/**
 * Reads an IMDb ratings or watchlist export. Ratings of series and of movies
 * in a film series are kept, and series on the watchlist. IMDb's own dates are
 * used, so a later change made here still wins over an older IMDb rating.
 */
export function fromImdbExport(
    text: string,
    known: { series: Set<string>; movies: Set<string> }
): ImdbImport | null {
    const [header, ...rows] = parseCsv(text.replace(/^﻿/, ''));
    const column = (name: string) => header?.indexOf(name) ?? -1;
    const id = column('Const');
    const rating = column('Your Rating');
    const rated = column('Date Rated');
    // Only list exports, like the watchlist, have positions.
    const position = column('Position');
    const created = column('Created');
    if (id === -1 || (rating === -1 && position === -1)) return null;

    const data: Record<string, unknown> = {};
    let matched = 0;
    for (const row of rows) {
        const titleId = row[id];
        const isSeries = known.series.has(titleId);
        if (!isSeries && !known.movies.has(titleId)) continue;
        const hasRating = rating !== -1 && row[rating] !== '';
        // Film series have no IMDb page to put on a watchlist.
        const onWatchlist = position !== -1 && isSeries;
        if (hasRating) {
            data[ratingKey(titleId)] = [
                Number(row[rating]),
                toTime(row[rated]),
            ];
        }
        if (onWatchlist) {
            data[watchlistKey(titleId)] = [1, toTime(row[created])];
        }
        if (hasRating || onWatchlist) matched++;
    }
    return { data: sanitize(data), matched, total: rows.length };
}
