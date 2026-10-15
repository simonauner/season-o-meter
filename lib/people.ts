import { mean } from './stats';
import type { Credit, Person, Role } from './types';
import {
    BETTER_WITH_AGE,
    BIG_SPREAD,
    BIG_SPREAD_MIN,
    FLAWLESS,
    hasStandout,
    isZigzag,
    rankVerdicts,
    RAN_OUT_OF_STEAM,
    SAVED_THE_BEST,
    type Shape,
    STANDOUT,
    STEADY,
    STEADY_AND_LOW,
    ZIGZAG,
} from './verdicts';

export type RoleList = {
    role: Role;
    slug: string;
    title: string;
    searchTitle: string;
    description: string;
};

export const ROLE_LISTS: RoleList[] = [
    {
        role: 'director',
        slug: 'directors',
        title: 'Directors',
        searchTitle: 'Most Popular Movie Directors, Every Movie Rated',
        description: 'The directors whose movies have the most votes on IMDb.',
    },
    {
        role: 'writer',
        slug: 'writers',
        title: 'Writers',
        searchTitle: 'Most Popular Screenwriters, Every Movie Rated',
        description:
            "The screenwriters whose movies have the most votes on IMDb. Writing the book or the characters a movie is based on doesn't count.",
    },
    {
        role: 'actor',
        slug: 'actors',
        title: 'Actors',
        searchTitle: 'Most Popular Movie Actors, Every Movie Rated',
        description:
            "The actors whose movies have the most votes on IMDb. Cameos and small parts don't count.",
    },
];

const ROLE_VERBS: Record<Role, string> = {
    director: 'directed',
    writer: 'wrote',
    actor: 'starred in',
};

const ROLE_LABELS: Record<Role, string> = {
    director: 'Director',
    writer: 'Writer',
    actor: 'Actor',
};

const orList = new Intl.ListFormat('en', { type: 'disjunction' });

/** What someone did in their movies, as in "the movies they directed or wrote". */
export const roleVerbs = (roles: Role[]) =>
    orList.format(roles.map((role) => ROLE_VERBS[role]));

/** "Director, Writer". */
export const roleLabels = (roles: Role[]) =>
    roles.map((role) => ROLE_LABELS[role]).join(', ');

/** Someone's part in a movie, like "Director · Writer" or "as Bruce Wayne". */
export const creditText = (credit: Credit) =>
    credit.roles
        .map((role) =>
            role === 'actor' && credit.character
                ? `as ${credit.character}`
                : ROLE_LABELS[role]
        )
        .join(' · ');

/**
 * Whether a movie counts for someone: anything but a cameo. A director
 * who has a cameo in their own movie still counts as its director.
 */
export const isCounted = (credit: Credit) =>
    !credit.cameo || credit.roles.some((role) => role !== 'actor');

/** Someone's movies that count, in release order. */
export const countedMovies = (person: Person) =>
    person.movies.filter(isCounted);

/** The people on a role's list, the most votes on their movies in it first. */
export function peopleInRole(people: Person[], role: Role): Person[] {
    const votes = (person: Person) =>
        countedMovies(person)
            .filter((movie) => movie.roles.includes(role))
            .reduce((sum, movie) => sum + movie.votes, 0);
    return people
        .filter((person) => person.roles.includes(role))
        .map((person) => ({ person, votes: votes(person) }))
        .sort((a, b) => b.votes - a.votes)
        .map(({ person }) => person);
}

export type CareerTrend = {
    best: Credit;
    worst: Credit;
    /** How many movies the early and recent averages are of. */
    span: number;
    /** Mean of the first `span` movies. */
    early: number;
    /** Mean of the latest `span` movies. */
    recent: number;
    /** From the early to the recent average. */
    change: number;
    /** Mean of all the movie ratings. */
    average: number;
    shape: Shape;
    verdict: string;
    /** Every way of saying it, starting with `verdict`. */
    verdicts: string[];
};

/** The early and recent averages are of at most this many movies each. */
const MAX_SPAN = 5;

/** A decade needs this many movies to count as someone's best. */
const MIN_DECADE_MOVIES = 3;
/** How far above the average a decade has to be to stand out. */
const DECADE_LEAD = 0.4;

const roundRating = (rating: number) => Math.round(rating * 10) / 10;

/** The decade whose movies are rated well above the rest, like 1990. */
function bestDecade(movies: Credit[], average: number): number | null {
    const byDecade = new Map<number, number[]>();
    for (const movie of movies) {
        if (movie.year === null) continue;
        const decade = Math.floor(movie.year / 10) * 10;
        byDecade.set(decade, [...(byDecade.get(decade) ?? []), movie.rating]);
    }
    const decades = [...byDecade].filter(
        ([, ratings]) => ratings.length >= MIN_DECADE_MOVIES
    );
    if (decades.length < 2) return null;
    const [decade, ratings] = decades.reduce((a, b) =>
        mean(b[1]) > mean(a[1]) ? b : a
    );
    return mean(ratings) - average >= DECADE_LEAD ? decade : null;
}

/** How someone's movies are rated over time, the ones that count. */
export function analyzeCareer(person: Person): CareerTrend | null {
    const movies = countedMovies(person);
    if (movies.length < 2) return null;

    const ratings = movies.map((movie) => movie.rating);
    const best = movies.reduce((a, b) => (b.rating > a.rating ? b : a));
    const worst = movies.reduce((a, b) => (b.rating < a.rating ? b : a));
    const last = movies[movies.length - 1];
    const span = Math.min(MAX_SPAN, Math.floor(movies.length / 2));
    // Rounded as shown, so the change adds up with them.
    const early = roundRating(mean(ratings.slice(0, span)));
    const recent = roundRating(mean(ratings.slice(-span)));
    const change = recent - early;
    const average = mean(ratings);
    const spread = best.rating - worst.rating;

    const [shape, options] = verdictOptions();
    const verdicts = rankVerdicts(person.id, options);

    function verdictOptions(): [Shape, string[]] {
        if (worst.rating >= 8) return ['flawless', FLAWLESS];
        if (spread < 0.4) {
            return ['steady', average < 6 ? STEADY_AND_LOW : STEADY];
        }
        if (change <= -0.75) {
            return [
                'decline',
                [
                    'Lost the touch',
                    'The early years were better',
                    'Not what it used to be',
                ],
            ];
        }
        if (change >= 0.75) return ['rise', BETTER_WITH_AGE];
        if (best === last) return ['best-last', SAVED_THE_BEST];
        if (worst === last) return ['worst-last', RAN_OUT_OF_STEAM];
        if (best === movies[0]) {
            return [
                'original-best',
                [`Never topped ${best.title}`, 'Started at the top'],
            ];
        }
        if (hasStandout(ratings)) return ['standout', STANDOUT];
        const decade = bestDecade(movies, average);
        if (decade !== null) {
            const years = `${String(decade).slice(2)}s`;
            return [
                'peaked',
                [`Best in the '${years}`, `Peaked in the '${years}`],
            ];
        }
        if (spread >= BIG_SPREAD_MIN) {
            return ['big-spread', [...BIG_SPREAD, 'Hit and miss']];
        }
        if (isZigzag(ratings)) return ['zigzag', ZIGZAG];
        return ['peaked', [`Peaked with ${best.title}`]];
    }

    return {
        best,
        worst,
        span,
        early,
        recent,
        change,
        average,
        shape,
        verdict: verdicts[0],
        verdicts,
    };
}

/** How many related people a page links to. */
const RELATED_COUNT = 6;

/** People who made the most movies with someone, and how many. */
export function workedWith(
    person: Person,
    people: Person[]
): { person: Person; together: number }[] {
    const movieIds = new Set(countedMovies(person).map((movie) => movie.id));
    return people
        .filter((other) => other !== person)
        .map((other) => ({
            person: other,
            together: countedMovies(other).filter((movie) =>
                movieIds.has(movie.id)
            ).length,
        }))
        .filter(({ together }) => together > 0)
        .sort(
            (a, b) => b.together - a.together || b.person.votes - a.person.votes
        )
        .slice(0, RELATED_COUNT);
}

/** At most this many people are linked to from a movie. */
const PEOPLE_PER_MOVIE = 6;

/** Actors before writers, since they're the ones most people know. */
const ROLE_ORDER: Role[] = ['director', 'actor', 'writer'];

export type MoviePerson = { person: Person; roles: Role[]; billing?: number };

const byMovie = new WeakMap<Person[], Map<string, MoviePerson[]>>();

/**
 * The people who made a movie, as far as the data has them, but not the
 * ones with a cameo in it: directors first, then actors in billing order,
 * then writers, the most popular first.
 */
export function moviePeople(movieId: string, people: Person[]): MoviePerson[] {
    let map = byMovie.get(people);
    if (!map) {
        map = new Map();
        for (const person of people) {
            for (const { id, roles, billing } of countedMovies(person)) {
                const list = map.get(id) ?? [];
                list.push({ person, roles, billing });
                map.set(id, list);
            }
        }
        const rank = ({ roles }: MoviePerson) =>
            Math.min(...roles.map((role) => ROLE_ORDER.indexOf(role)));
        for (const list of map.values()) {
            list.sort(
                (a, b) =>
                    rank(a) - rank(b) ||
                    (a.billing ?? Infinity) - (b.billing ?? Infinity) ||
                    b.person.votes - a.person.votes
            );
        }
        byMovie.set(people, map);
    }
    return (map.get(movieId) ?? []).slice(0, PEOPLE_PER_MOVIE);
}
