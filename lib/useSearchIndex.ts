'use client';

import type { SearchEntry } from './searchIndex';
import { useStaticJson } from './useStaticJson';

/**
 * Every series and film series, from /search-index.json. Not fetched until
 * `enabled`, like when the search box is first used.
 */
export function useSearchIndex(enabled = true) {
    const { data, failed } = useStaticJson<SearchEntry[]>(
        '/search-index.json',
        enabled
    );
    return { index: data, failed };
}
