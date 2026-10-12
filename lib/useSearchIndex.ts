'use client';

import { useEffect, useState } from 'react';
import type { SearchEntry } from './searchIndex';

/** Shared between components, so the index is fetched once per page view. */
let request: Promise<SearchEntry[]> | null = null;

const fetchIndex = () =>
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/search-index.json`).then(
        (res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json() as Promise<SearchEntry[]>;
        }
    );

/** Every series and film series, from /search-index.json. */
export function useSearchIndex() {
    const [index, setIndex] = useState<SearchEntry[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let live = true;
        request ??= fetchIndex();
        request.then(
            (entries) => {
                if (live) setIndex(entries);
            },
            () => {
                // Lets the next page try again.
                request = null;
                if (live) setFailed(true);
            }
        );
        return () => {
            live = false;
        };
    }, []);

    return { index, failed };
}
