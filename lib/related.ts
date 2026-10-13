import { analyzeSeasons } from './analysis';
import { analyzeMovies } from './franchiseAnalysis';
import type { Franchise, Show } from './types';
import type { Shape } from './verdicts';

/*
 * Titles to link to at the bottom of a title's page. Besides giving
 * visitors somewhere to go next, the links are how search engines find
 * pages that no list links to, so every title has to be reachable from
 * the front page.
 */

const RELATED_COUNT = 6;

/** How far apart two vote counts are, by ratio, so 5k vs 10k is like 1M vs 2M. */
const votesApart = (a: number, b: number) => Math.abs(Math.log(a / b));

/** How much votes apart (see votesApart) count against genres in common (0–1). */
const PER_VOTES_APART = 0.1;
/**
 * How much the same shape of ratings counts, like ending on the worst
 * season. Less than a genre in common, so it decides between titles of the
 * same genres more than it crosses genres.
 */
const SAME_SHAPE = 0.25;

/** At most this many of a title's links go to titles that depend on them. */
const MAX_CHILDREN = 3;

const linksByList = new WeakMap<object[], Map<object, object[]>>();

/**
 * Every item's links, worked out once per list since every page asks for
 * the same. Linking only to the closest matches would leave some items
 * unreachable, so the links include a tree: every item but the most
 * popular is linked to from its closest match among the more popular ones
 * that has room, which leads back to the most popular one, on the front
 * page. The other links go to the closest matches.
 */
function linksFor<T extends { votes: number }>(
    items: T[],
    /** Gives the ranking of every other item, closest first, for an item. */
    makeClosest: () => (item: T) => T[]
): Map<T, T[]> {
    const cached = linksByList.get(items);
    if (cached) return cached as Map<T, T[]>;

    const closest = makeClosest();
    const ranked = new Map(items.map((item) => [item, closest(item)]));
    const byVotes = items.toSorted((a, b) => b.votes - a.votes);
    const children = new Map(items.map((item): [T, T[]] => [item, []]));
    // k placed items have room for 3k children and have k - 1, so there's
    // always a parent.
    const placed = new Set<T>(byVotes.slice(0, 1));
    for (const item of byVotes.slice(1)) {
        const parent = ranked
            .get(item)!
            .find(
                (other) =>
                    placed.has(other) &&
                    children.get(other)!.length < MAX_CHILDREN
            )!;
        children.get(parent)!.push(item);
        placed.add(item);
    }

    const links = new Map(
        items.map((item) => {
            const rank = ranked.get(item)!;
            const own = children.get(item)!;
            const rest = rank
                .filter((other) => !own.includes(other))
                .slice(0, RELATED_COUNT - own.length);
            const position = new Map(rank.map((other, i) => [other, i]));
            return [
                item,
                [...own, ...rest].sort(
                    (a, b) => position.get(a)! - position.get(b)!
                ),
            ];
        })
    );
    linksByList.set(items, links);
    return links;
}

/** Every item's shape, or none if it has too few ratings for one. */
const shapesOf = <T>(items: T[], shapeOf: (item: T) => Shape | undefined) =>
    new Map(items.map((item) => [item, shapeOf(item)]));

/**
 * Series with the same genres, or as many of them as possible, the same
 * shape of ratings, and about as popular. Another series with the same
 * title comes first, like the British and American The Office.
 */
export function relatedShows(show: Show, shows: Show[]): Show[] {
    const makeClosest = () => {
        const shapes = shapesOf(shows, (item) => analyzeSeasons(item)?.shape);
        return (item: Show) => {
            const genres = new Set(item.genres);
            const shape = shapes.get(item);
            // Genres in common, more if the ratings have the same shape, and
            // less a little for every doubling in votes apart.
            const score = (other: Show) =>
                other.genres.filter((genre) => genres.has(genre)).length /
                    new Set([...item.genres, ...other.genres]).size +
                (shape && shapes.get(other) === shape ? SAME_SHAPE : 0) -
                PER_VOTES_APART * votesApart(item.votes, other.votes);
            return shows
                .filter((other) => other !== item)
                .map((other) => ({
                    other,
                    sameTitle: other.title === item.title,
                    score: score(other),
                }))
                .sort(
                    (a, b) =>
                        Number(b.sameTitle) - Number(a.sameTitle) ||
                        b.score - a.score
                )
                .map(({ other }) => other);
        };
    };
    return linksFor(shows, makeClosest).get(show) ?? [];
}

/**
 * Film series with the most movies in common first, like the Marvel
 * Cinematic Universe and Avengers, then the ones with the same shape of
 * ratings and about as popular.
 */
export function relatedFranchises(
    franchise: Franchise,
    franchises: Franchise[]
): Franchise[] {
    const makeClosest = () => {
        const shapes = shapesOf(
            franchises,
            (item) => analyzeMovies(item)?.shape
        );
        return (item: Franchise) => {
            const movieIds = new Set(item.movies.map((movie) => movie.id));
            const shape = shapes.get(item);
            const score = (other: Franchise) =>
                (shape && shapes.get(other) === shape ? SAME_SHAPE : 0) -
                PER_VOTES_APART * votesApart(item.votes, other.votes);
            return franchises
                .filter((other) => other !== item)
                .map((other) => ({
                    other,
                    shared: other.movies.filter((movie) =>
                        movieIds.has(movie.id)
                    ).length,
                    score: score(other),
                }))
                .sort((a, b) => b.shared - a.shared || b.score - a.score)
                .map(({ other }) => other);
        };
    };
    return linksFor(franchises, makeClosest).get(franchise) ?? [];
}
