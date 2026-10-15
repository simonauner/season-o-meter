'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { Sparkline } from '@/components/Sparkline';
import {
    changeTone,
    countOf,
    formatChange,
    formatVotes,
    formatYears,
} from '@/lib/format';
import { type SearchEntry, search } from '@/lib/searchIndex';
import { useSearchIndex } from '@/lib/useSearchIndex';
import css from './search.module.css';

const MAX_RESULTS = 30;

const ROUTES = {
    series: { path: '/shows', parts: 'season' },
    movies: { path: '/movies', parts: 'movie' },
} satisfies Record<SearchEntry['type'], { path: string; parts: string }>;

export function SearchResults() {
    const query = useSearchParams().get('q')?.trim() ?? '';
    const { index, failed } = useSearchIndex();

    const results = useMemo(
        () => (index ? search(index, query).slice(0, MAX_RESULTS) : []),
        [index, query]
    );

    if (!query) {
        return (
            <PageIntro title="Search">
                Type the name of a series or film series in the search box
                above.
            </PageIntro>
        );
    }

    return (
        <>
            <PageIntro title={`“${query}”`} />
            {failed ? (
                <p className={css.status}>Could not load the search index.</p>
            ) : !index ? (
                <p className={css.status}>Searching…</p>
            ) : results.length === 0 ? (
                <p className={css.status}>
                    Nothing matched. Only series with 5,000 votes on IMDb, and
                    film series with at least two movies, are included.
                </p>
            ) : (
                <ul className={css.results}>
                    {results.map((entry) => {
                        const route = ROUTES[entry.type];
                        // Nothing to compare with only one season.
                        const change =
                            entry.ratings.length >= 2
                                ? entry.ratings[entry.ratings.length - 1] -
                                  entry.ratings[0]
                                : null;
                        return (
                            <li key={entry.id}>
                                <Link
                                    href={`${route.path}/${entry.id}/`}
                                    className={css.result}
                                >
                                    <span className={css.name}>
                                        <strong>{entry.title}</strong>
                                        <span>
                                            {formatYears(entry)} ·{' '}
                                            {countOf(
                                                entry.ratings.length,
                                                route.parts
                                            )}{' '}
                                            · {formatVotes(entry.votes)} votes
                                        </span>
                                    </span>
                                    <span className={css.spark}>
                                        <Sparkline ratings={entry.ratings} />
                                    </span>
                                    <span
                                        className={`${css.change} ${change === null ? '' : (css[changeTone(change) ?? ''] ?? '')}`}
                                    >
                                        {change !== null &&
                                            formatChange(change)}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
