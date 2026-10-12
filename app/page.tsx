import { Suspense } from 'react';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid, ShowGridSkeleton } from '@/components/ShowGrid';
import { getShowList } from '@/lib/tmdb';

export default function Page() {
    return (
        <>
            <PageIntro title="Where did it peak?">
                How this week&apos;s trending series are rated, season by
                season.
            </PageIntro>
            <Suspense fallback={<ShowGridSkeleton />}>
                <ShowGrid load={() => getShowList('trending')} />
            </Suspense>
        </>
    );
}
