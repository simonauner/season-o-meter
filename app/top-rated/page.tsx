import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid, ShowGridSkeleton } from '@/components/ShowGrid';
import { getShowList } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Top rated' };

export default function Page() {
    return (
        <>
            <PageIntro title="Top rated series">
                Even the best-rated series have their weaker seasons.
            </PageIntro>
            <Suspense fallback={<ShowGridSkeleton />}>
                <ShowGrid load={() => getShowList('top-rated')} />
            </Suspense>
        </>
    );
}
