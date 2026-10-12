'use client';

import { PageIntro } from '@/components/PageIntro';

export default function Error({ retry }: { retry: () => void }) {
    return (
        <>
            <PageIntro title="Something went wrong">
                We couldn&apos;t load data from TMDB right now.
            </PageIntro>
            <button type="button" onClick={retry}>
                Try again
            </button>
        </>
    );
}
