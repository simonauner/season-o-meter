/** What a page lists: series, or film series. */
export type Kind = 'series' | 'movies';

/**
 * The choices for the page-wide "at least N seasons" filter on series pages,
 * and "at least N movies" on film series pages.
 */
export const MIN_COUNT_OPTIONS = [2, 3, 4] as const;

export type MinCount = (typeof MIN_COUNT_OPTIONS)[number];

export const DEFAULT_MIN_COUNT: Record<Kind, MinCount> = {
    series: 4,
    // Every film series has at least two movies, so this shows them all.
    movies: 2,
};

/**
 * Builds one value per filter choice. The site is static, so every choice is
 * rendered at build time and the visitor's choice picks one in the browser.
 */
export const forEachMinCount = <T>(
    build: (minCount: MinCount) => T
): Record<MinCount, T> =>
    Object.fromEntries(
        MIN_COUNT_OPTIONS.map((minCount) => [minCount, build(minCount)])
    ) as Record<MinCount, T>;
