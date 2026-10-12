export const mean = (values: number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;

/** Least-squares slope of the ratings, per step. */
export const slope = (ratings: number[]) => {
    const meanX = (ratings.length - 1) / 2;
    const meanY = mean(ratings);
    let covariance = 0;
    let variance = 0;
    ratings.forEach((y, x) => {
        covariance += (x - meanX) * (y - meanY);
        variance += (x - meanX) ** 2;
    });
    return variance === 0 ? 0 : covariance / variance;
};
