/** The choices for the page-wide "at least N seasons" filter. */
export const MIN_SEASONS_OPTIONS = [2, 3, 4] as const;

export type MinSeasons = (typeof MIN_SEASONS_OPTIONS)[number];

export const DEFAULT_MIN_SEASONS: MinSeasons = 4;

/**
 * Builds one value per filter choice. The site is static, so every choice is
 * rendered at build time and the visitor's choice picks one in the browser.
 */
export const forEachMinSeasons = <T>(
    build: (minSeasons: MinSeasons) => T
): Record<MinSeasons, T> =>
    Object.fromEntries(
        MIN_SEASONS_OPTIONS.map((minSeasons) => [minSeasons, build(minSeasons)])
    ) as Record<MinSeasons, T>;
