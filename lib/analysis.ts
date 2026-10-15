import { numberWord } from './format';
import { DEFAULT_MIN_COUNT, type MinCount } from './minCount';
import { findSections, type SectionDefinition } from './sections';
import { mean, slope } from './stats';
import type { RatedSeason, SeasonRating, Show } from './types';
import {
    BETTER_WITH_AGE,
    BIG_SPREAD,
    BIG_SPREAD_MIN,
    COMEBACK,
    FLAWLESS,
    hasStandout,
    hasTwinPeaks,
    isComeback,
    isZigzag,
    RAN_OUT_OF_STEAM,
    rankVerdicts,
    type Shape,
    SAVED_THE_BEST,
    STANDOUT,
    STEADY,
    STEADY_AND_LOW,
    TWIN_PEAKS,
    ZIGZAG,
} from './verdicts';

/**
 * Seasons with a rating based on at least half of their episodes. A season
 * that has only just started airing would otherwise skew the curve.
 */
export const ratedSeasons = (seasons: SeasonRating[]): RatedSeason[] =>
    seasons.filter(
        (season): season is RatedSeason =>
            season.rating !== null &&
            season.ratedEpisodeCount * 2 >= season.episodeCount
    );

const hasEnded = (show: Show) => show.endYear !== null;

const STILL_CLIMBING = [
    'Still climbing',
    'To infinity and beyond!',
    "We're gonna need a bigger boat",
    'The best is yet to come',
    'Just getting started',
    'Hitting its stride',
];
const FELL_AT_THE_FINISH = [
    'Fell at the finish line',
    'You were the chosen one!',
    'Hasta la vista, quality',
    'Houston, we have a problem',
    'Fumbled the ending',
    "The ending we don't talk about",
    "I've got a bad feeling about this",
    'Fade to meh',
];
/** Still running, and the latest season is the worst so far. */
const LATEST_IS_WORST = [
    'Brace yourselves',
    'Winter is coming',
    'Danger, Will Robinson!',
    'Storm clouds gathering',
];

export type SeasonTrend = {
    best: RatedSeason;
    worst: RatedSeason;
    first: RatedSeason;
    last: RatedSeason;
    /** Mean of the season ratings. */
    average: number;
    /** Rating change from the first to the last rated season. */
    change: number;
    shape: Shape;
    verdict: string;
    /** Every way of saying it, starting with `verdict`. */
    verdicts: string[];
};

export function analyzeSeasons(show: Show): SeasonTrend | null {
    const rated = ratedSeasons(show.seasons);
    if (rated.length < 2) return null;

    const ratings = rated.map((season) => season.rating);
    const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a));
    const worst = rated.reduce((a, b) => (b.rating < a.rating ? b : a));
    const first = rated[0];
    const last = rated[rated.length - 1];
    const average = mean(ratings);
    const spread = best.rating - worst.rating;
    // The trend over the whole run, so long shows aren't judged per season.
    const fittedChange = slope(ratings) * (rated.length - 1);
    const ended = hasEnded(show);

    const [shape, options] = verdictOptions();
    const verdicts = rankVerdicts(show.id, options);

    function verdictOptions(): [Shape, string[]] {
        if (worst.rating >= 8.5) return ['flawless', FLAWLESS];
        if (spread < 0.4) {
            return [
                'steady',
                average < 7
                    ? STEADY_AND_LOW
                    : [...STEADY, 'Same procedure as every season'],
            ];
        }
        if (best === last) {
            return ['best-last', ended ? SAVED_THE_BEST : STILL_CLIMBING];
        }
        if (last === worst) {
            return ['worst-last', ended ? FELL_AT_THE_FINISH : LATEST_IS_WORST];
        }
        if (ended && last.rating < average - 0.3) {
            return ['ran-out-of-steam', RAN_OUT_OF_STEAM];
        }
        if (isZigzag(ratings)) return ['zigzag', ZIGZAG];
        if (hasTwinPeaks(ratings)) return ['twin-peaks', TWIN_PEAKS];
        if (isComeback(ratings)) return ['comeback', COMEBACK];
        if (spread >= BIG_SPREAD_MIN) return ['big-spread', BIG_SPREAD];
        if (fittedChange <= -0.5) {
            return [
                'decline',
                [
                    `All downhill since season ${best.seasonNumber}`,
                    'I see dead seasons',
                    "Should've quit while ahead",
                    'The thrill is gone',
                ],
            ];
        }
        if (fittedChange >= 0.5) {
            return ['rise', [...BETTER_WITH_AGE, 'Seasoned to perfection']];
        }
        if (hasStandout(ratings)) return ['standout', STANDOUT];
        return [
            'peaked',
            [
                `Peaked in season ${best.seasonNumber}`,
                ...(best.seasonNumber === 1
                    ? [
                          "Here's looking at you, season 1",
                          'You had me at season 1',
                      ]
                    : []),
                ...(best.seasonNumber === 4
                    ? ['May the 4th season be with you']
                    : []),
            ],
        ];
    }

    return {
        best,
        worst,
        first,
        last,
        average,
        change: last.rating - first.rating,
        shape,
        verdict: verdicts[0],
        verdicts,
    };
}

const MIN_VOTES = 50_000;
/** About as many as a season of network TV. */
const MAX_EPISODES_IN_A_SEASON = 26;

const SECTION_DEFINITIONS: SectionDefinition<Show>[] = [
    {
        slug: 'most-popular',
        title: 'Most popular',
        searchTitle: 'Most Popular TV Shows, Rated Season by Season',
        description: 'The series with the most ratings on IMDb.',
        minVotes: MIN_VOTES,
        minRatings: 2,
        score: (_, show) => show.votes,
    },
    {
        slug: 'best-over-time',
        title: 'Best over time',
        searchTitle: 'Best TV Shows of All Time, by Season Ratings',
        description: (minSeasons) =>
            `Highest average across all seasons, at least ${numberWord(minSeasons)} of them.`,
        minVotes: MIN_VOTES,
        minRatings: 2,
        score: (ratings) => mean(ratings),
    },
    {
        slug: 'slow-starters',
        title: 'Slow starters',
        searchTitle: 'TV Shows That Get Better After Season 1',
        description:
            'Began weak but found their footing. Worth getting through season 1.',
        minVotes: MIN_VOTES,
        minRatings: 3,
        score: ([first, ...rest]) => {
            const gain = mean(rest) - first;
            return gain >= 0.4 && Math.min(...rest) > first ? gain : null;
        },
    },
    {
        slug: 'mid-run-slump',
        title: 'The mid-run slump',
        searchTitle: 'TV Shows That Got Bad, Then Good Again',
        description: 'Dipped in the middle, then won the audience back.',
        minVotes: MIN_VOTES,
        minRatings: 4,
        // Very long runs wobble too much to have a single "middle".
        maxRatings: 12,
        score: (ratings) => {
            const middle = ratings.slice(1, -1);
            const low = Math.min(...middle);
            const lowIndex = ratings.indexOf(low);
            const before = Math.max(...ratings.slice(0, lowIndex));
            const after = Math.max(...ratings.slice(lowIndex + 1));
            const dip = Math.min(before, after) - low;
            // The recovery has to come close to where it was before the dip.
            return dip >= 0.4 && after >= before - 0.2 ? dip : null;
        },
    },
    {
        slug: 'house-of-cards',
        title: 'Collapsed like a house of cards',
        searchTitle: 'TV Shows With the Worst Final Seasons',
        description: 'Ended on a final season far below everything before it.',
        sharedVerdict: true,
        minVotes: MIN_VOTES,
        minRatings: 3,
        filter: hasEnded,
        score: (ratings) => {
            const last = ratings[ratings.length - 1];
            const before = ratings.slice(0, -1);
            const drop = mean(before) - last;
            return drop >= 0.6 && last < Math.min(...before) ? drop : null;
        },
    },
    {
        slug: 'better-every-season',
        title: 'Better every season',
        searchTitle: 'TV Shows That Got Better Every Season',
        description: 'Every season rated higher than the one before.',
        sharedVerdict: true,
        minVotes: MIN_VOTES,
        minRatings: 3,
        score: (ratings) =>
            ratings.every((rating, i) => i === 0 || rating > ratings[i - 1])
                ? ratings[ratings.length - 1] - ratings[0]
                : null,
    },
    {
        slug: 'long-goodbye',
        title: 'The long goodbye',
        searchTitle: 'TV Shows That Slowly Went Downhill',
        description: 'Long-running series on a slow, steady decline.',
        minVotes: MIN_VOTES,
        minRatings: 7,
        score: (ratings) => {
            const decline = -slope(ratings) * (ratings.length - 1);
            // A slow decline, not a single collapse.
            const steepestDrop = Math.max(
                ...ratings.slice(1).map((rating, i) => ratings[i] - rating)
            );
            return decline >= 0.8 && steepestDrop <= 1 ? decline : null;
        },
    },
    {
        slug: 'one-season-wonders',
        title: 'One season wonders',
        searchTitle: 'Best Miniseries and One-Season TV Shows',
        description: 'Ended after a single season. No curve, just a rating.',
        ownMinimum: true,
        minVotes: MIN_VOTES,
        minRatings: 1,
        maxRatings: 1,
        // IMDb lists some long anime, like One Piece, as one season.
        filter: (show) =>
            hasEnded(show) &&
            show.seasons.length === 1 &&
            show.seasons[0].episodeCount <= MAX_EPISODES_IN_A_SEASON,
        score: (_, show) => show.rating,
    },
];

export const SHOW_SECTION_SLUGS = SECTION_DEFINITIONS.map(({ slug }) => slug);

export const findShowSections = (
    shows: Show[],
    limit: number,
    minSeasons: MinCount = DEFAULT_MIN_COUNT.series
) =>
    findSections(
        shows,
        SECTION_DEFINITIONS,
        (show) => ratedSeasons(show.seasons).map((season) => season.rating),
        limit,
        minSeasons
    );
