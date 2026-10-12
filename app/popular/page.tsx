import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid, ShowGridSkeleton } from '@/components/ShowGrid';
import { getShowList } from '@/lib/tmdb';

export const metadata: Metadata = { title: 'Popular' };

export default function Page() {
    return (
        <>
            <PageIntro title="Popular series">
                The most popular series on TMDB right now, season by season.
            </PageIntro>
            <Suspense fallback={<ShowGridSkeleton />}>
                <ShowGrid load={() => getShowList('popular')} />
            </Suspense>
        </>
    );
}
