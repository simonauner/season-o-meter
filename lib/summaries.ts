import { ratedSeasons, type SeasonTrend } from './analysis';
import type { MovieTrend } from './franchiseAnalysis';
import { formatRating, formatVotes } from './format';
import { mean } from './stats';
import type { Franchise, Movie, RatedSeason, Show } from './types';

/*
 * A few plain sentences about how a title is rated, for its page. The
 * verdict is a joke; these say the same in words that answer what people
 * search for, like "does it get better" or "what's the best season".
 */

/** Within this much, ratings count as the same. */
const SAME = 0.05;
/** Less than this between the best and the worst, and it's even. */
const EVEN = 0.4;

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' });

/** From the ratings as shown, so the change adds up with them. */
const changeInWords = (from: number, to: number) => {
    const change = Number(formatRating(to)) - Number(formatRating(from));
    return Math.abs(change) < SAME
        ? 'stayed the same'
        : `went ${change > 0 ? 'up' : 'down'} by ${Math.abs(change).toFixed(1)}`;
};

export function summarizeSeasons(show: Show, trend: SeasonTrend): string {
    const { best, worst, first, last } = trend;
    const rated = ratedSeasons(show.seasons);
    const ended = show.endYear !== null;
    const season = (s: RatedSeason) => `season ${s.seasonNumber}`;
    const rating = (s: RatedSeason) => formatRating(s.rating);
    const sentences: string[] = [];

    if (best.rating - worst.rating < SAME) {
        sentences.push(
            `${show.title} is as even as it gets: every season is rated ${rating(best)} on IMDb.`
        );
    } else if (best.rating - worst.rating < EVEN) {
        sentences.push(
            `${show.title} is remarkably even: every season is rated between ${rating(worst)} and ${rating(best)} on IMDb, with ${season(best)} just ahead.`
        );
    } else {
        sentences.push(
            `The best season of ${show.title} is ${season(best)}, with an average episode rating of ${rating(best)} on IMDb, and the worst is ${season(worst)}, at ${rating(worst)}.`
        );
    }

    const later = rated.slice(1);
    if (last === best) {
        sentences.push(
            ended
                ? `It ended on its highest rated season.`
                : `The latest season, ${season(last)}, is its best so far.`
        );
    } else if (last === worst) {
        sentences.push(
            ended
                ? `It ended on its lowest rated season, ${formatRating(mean(rated.slice(0, -1).map((s) => s.rating)) - last.rating)} below the average of the seasons before it.`
                : `The latest season, ${season(last)}, is its weakest so far.`
        );
    } else if (later.every((s) => s.rating > first.rating)) {
        sentences.push(
            `It got better after a slower start: every season after ${season(first)} is rated higher.`
        );
    } else if (first === best) {
        sentences.push(`None of the later seasons matched ${season(first)}.`);
    } else {
        sentences.push(
            `From ${season(first)} (${rating(first)}) to ${season(last)} (${rating(last)}), the rating ${changeInWords(first.rating, last.rating)}.`
        );
    }

    sentences.push(
        `Its seasons average ${formatRating(trend.average)}, and the series as a whole is rated ${formatRating(show.rating)} on IMDb, from ${formatVotes(show.votes)} votes.`
    );

    const ranked = new Set(rated.map((s) => s.seasonNumber));
    const unranked = show.seasons
        .filter((s) => !ranked.has(s.seasonNumber))
        .map((s) => String(s.seasonNumber));
    if (unranked.length > 0) {
        sentences.push(
            unranked.length === 1
                ? `Season ${unranked[0]} isn't ranked, since fewer than half of its episodes have been rated yet.`
                : `Seasons ${listFormat.format(unranked)} aren't ranked, since fewer than half of their episodes have been rated yet.`
        );
    }

    return sentences.join(' ');
}

export function summarizeMovies(
    franchise: Franchise,
    trend: MovieTrend
): string {
    const { best, worst, first, last } = trend;
    const { movies } = franchise;
    const movie = (m: Movie) => `${m.title}${m.year ? ` (${m.year})` : ''}`;
    const sentences: string[] = [];

    if (best.rating - worst.rating < SAME) {
        sentences.push(
            `It's as even as it gets: all ${movies.length} movies are rated ${formatRating(best.rating)} on IMDb.`
        );
    } else if (best.rating - worst.rating < EVEN) {
        sentences.push(
            `Its ${movies.length} movies are remarkably even: every one is rated between ${formatRating(worst.rating)} and ${formatRating(best.rating)} on IMDb, with ${movie(best)} just ahead.`
        );
    } else {
        sentences.push(
            `The best of its ${movies.length} movies is ${movie(best)}, rated ${formatRating(best.rating)} on IMDb, and the worst is ${movie(worst)}, at ${formatRating(worst.rating)}.`
        );
    }

    const sequels = movies.slice(1);
    if (last === best) {
        sentences.push(`The latest movie is the best one yet.`);
    } else if (last === worst) {
        sentences.push(`The latest movie is also the worst.`);
    } else if (sequels.every((m) => m.rating > first.rating)) {
        sentences.push(`Every sequel beat ${movie(first)}.`);
    } else if (first === best) {
        sentences.push(`None of the sequels beat ${movie(first)}.`);
    } else {
        sentences.push(
            `From ${movie(first)} at ${formatRating(first.rating)} to ${movie(last)} at ${formatRating(last.rating)}, the rating ${changeInWords(first.rating, last.rating)}.`
        );
    }

    sentences.push(
        `Together they average ${formatRating(trend.average)}, from ${formatVotes(franchise.votes)} votes in total.`
    );

    return sentences.join(' ');
}
