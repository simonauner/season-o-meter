'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { Sparkline } from '@/components/Sparkline';
import {
    changeTone,
    formatChange,
    formatVotes,
    formatYears,
} from '@/lib/format';
import type { SearchEntry } from '@/lib/searchIndex';
import css from './search.module.css';

const MAX_RESULTS = 30;

const ROUTES = {
    series: { path: '/shows', parts: 'seasons' },
    movies: { path: '/movies', parts: 'movies' },
} satisfies Record<SearchEntry['type'], { path: string; parts: string }>;

const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

export function SearchResults() {
    const query = useSearchParams().get('q')?.trim() ?? '';
    const [index, setIndex] = useState<SearchEntry[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/search-index.json`)
            .then((res) => res.json())
            .then(setIndex)
            .catch(() => setFailed(true));
    }, []);

    const results = useMemo(() => {
        if (!index || !query) return [];
        const words = normalize(query).split(/\s+/);
        // The index is sorted by votes, so popular matches come first.
        return index
            .filter((entry) => {
                const title = normalize(entry.title);
                return words.every((word) => title.includes(word));
            })
            .slice(0, MAX_RESULTS);
    }, [index, query]);

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
                    Nothing matched. Only series with at least two rated seasons
                    and 5,000 votes on IMDb, and film series with at least two
                    movies, are included.
                </p>
            ) : (
                <ul className={css.results}>
                    {results.map((entry) => {
                        const route = ROUTES[entry.type];
                        const change =
                            entry.ratings[entry.ratings.length - 1] -
                            entry.ratings[0];
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
                                            {entry.ratings.length} {route.parts}{' '}
                                            · {formatVotes(entry.votes)} votes
                                        </span>
                                    </span>
                                    <span className={css.spark}>
                                        <Sparkline ratings={entry.ratings} />
                                    </span>
                                    <span
                                        className={`${css.change} ${css[changeTone(change) ?? ''] ?? ''}`}
                                    >
                                        {formatChange(change)}
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
