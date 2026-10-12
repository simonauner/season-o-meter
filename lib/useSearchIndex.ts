'use client';

import type { SearchEntry } from './searchIndex';
import { useStaticJson } from './useStaticJson';

/** Every series and film series, from /search-index.json. */
export function useSearchIndex() {
    const { data, failed } = useStaticJson<SearchEntry[]>('/search-index.json');
    return { index: data, failed };
}
