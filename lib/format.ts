export const formatRating = (rating: number) => rating.toFixed(1);

export const formatChange = (change: number) => {
    const rounded = Number(change.toFixed(1));
    if (rounded === 0) return '±0.0';
    return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(1)}`;
};

export const year = (date: string | null) => date?.slice(0, 4) ?? null;

export const posterUrl = (path: string, width: 185 | 342 | 500 = 342) =>
    `https://image.tmdb.org/t/p/w${width}${path}`;
