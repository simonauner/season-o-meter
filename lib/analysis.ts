import type { RatedSeason, SeasonRating } from './types';

export const ratedSeasons = (seasons: SeasonRating[]): RatedSeason[] =>
    seasons.filter((season): season is RatedSeason => season.rating !== null);

const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

/** Least-squares slope of rating per season. */
const slope = (seasons: RatedSeason[]) => {
    const xs = seasons.map((_, index) => index);
    const ys = seasons.map((season) => season.rating);
    const meanX = mean(xs);
    const meanY = mean(ys);
    const covariance = xs.reduce(
        (sum, x, i) => sum + (x - meanX) * (ys[i] - meanY),
        0
    );
    const variance = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
    return variance === 0 ? 0 : covariance / variance;
};

export type SeasonTrend = {
    best: RatedSeason;
    worst: RatedSeason;
    first: RatedSeason;
    last: RatedSeason;
    /** Rating change from the first to the last rated season. */
    change: number;
    /** Average rating change per season (linear fit). */
    slopePerSeason: number;
    verdict: string;
};

export function analyzeSeasons(
    seasons: SeasonRating[],
    { ended }: { ended: boolean }
): SeasonTrend | null {
    const rated = ratedSeasons(seasons);
    if (rated.length < 2) return null;

    const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a));
    const worst = rated.reduce((a, b) => (b.rating < a.rating ? b : a));
    const first = rated[0];
    const last = rated[rated.length - 1];
    const slopePerSeason = slope(rated);
    // The trend over the whole run, so long shows aren't judged per season.
    const fittedChange = slopePerSeason * (rated.length - 1);
    const spread = best.rating - worst.rating;
    const average = mean(rated.map((season) => season.rating));

    let verdict: string;
    if (spread < 0.4) {
        verdict = 'Rock steady';
    } else if (best === last) {
        verdict = ended ? 'Saved the best for last' : 'Still climbing';
    } else if (ended && last === worst) {
        verdict = 'Fell at the finish line';
    } else if (ended && last.rating < average - 0.3) {
        verdict = 'Ran out of steam';
    } else if (fittedChange <= -0.5) {
        verdict = `All downhill since season ${best.seasonNumber}`;
    } else if (fittedChange >= 0.5) {
        verdict = 'Getting better with age';
    } else {
        verdict = `Peaked in season ${best.seasonNumber}`;
    }

    return {
        best,
        worst,
        first,
        last,
        change: last.rating - first.rating,
        slopePerSeason,
        verdict,
    };
}
