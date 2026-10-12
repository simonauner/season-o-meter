import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SearchResults } from './SearchResults';

export const metadata: Metadata = { title: 'Search' };

export default function Page() {
    return (
        <Suspense>
            <SearchResults />
        </Suspense>
    );
}
