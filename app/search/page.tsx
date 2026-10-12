import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid, ShowGridSkeleton } from '@/components/ShowGrid';
import { searchShows } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Search' };

async function Results({
    searchParams,
}: Pick<PageProps<'/search'>, 'searchParams'>) {
    const { q } = await searchParams;
    const query = (Array.isArray(q) ? q[0] : q)?.trim();

    if (!query) {
        return (
            <PageIntro title="Search">
                Type the name of a series in the search box above.
            </PageIntro>
        );
    }

    return (
        <>
            <PageIntro title={`“${query}”`}>
                Series matching your search with more than one rated season.
            </PageIntro>
            <ShowGrid
                load={() => searchShows(query)}
                empty="No series with more than one rated season matched your search."
            />
        </>
    );
}

export default function Page({ searchParams }: PageProps<'/search'>) {
    return (
        <Suspense fallback={<ShowGridSkeleton />}>
            <Results searchParams={searchParams} />
        </Suspense>
    );
}
