import type { Show } from './types';

const NUMBER_WORDS: Record<number, string> = {
    2: 'two',
    3: 'three',
    4: 'four',
};

/** Small numbers in words, as in "at least three of them". */
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);

/** Ends the text with a full stop unless it already ends a sentence. */
export const sentence = (text: string) =>
    /[.!?…]$/.test(text) ? text : `${text}.`;

export const formatRating = (rating: number) => rating.toFixed(1);

export const formatChange = (change: number) => {
    const rounded = Number(change.toFixed(1));
    if (rounded === 0) return '±0.0';
    return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)}`;
};

export const formatVotes = (votes: number) =>
    new Intl.NumberFormat('en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(votes);

export const formatYears = ({
    startYear,
    endYear,
}: Pick<Show, 'startYear' | 'endYear'>) => {
    if (startYear === null) return '';
    if (endYear === null) return `${startYear}–`;
    if (endYear === startYear) return String(startYear);
    return `${startYear}–${endYear}`;
};

export const changeTone = (change: number) =>
    change >= 0.05 ? 'up' : change <= -0.05 ? 'down' : undefined;
