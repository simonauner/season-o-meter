import type { Show } from './types';

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
