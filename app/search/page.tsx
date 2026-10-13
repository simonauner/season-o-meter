import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchResults } from './SearchResults';

export const metadata: Metadata = {
    title: 'Search',
    // Results are found in the browser, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return (
        <Suspense>
            <SearchResults />
        </Suspense>
    );
}
