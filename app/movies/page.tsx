import type { Metadata } from 'next';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { HomeSection } from '@/components/HomeSection';
import { PageIntro } from '@/components/PageIntro';
import { getFranchises } from '@/lib/data';
import { findFranchiseSections } from '@/lib/franchiseAnalysis';

const FRANCHISES_PER_SECTION = 6;

export const metadata: Metadata = {
    title: 'Movies',
    description:
        'See how film series are rated movie by movie: did the sequels live up to the original?',
};

export default function Page() {
    const sections = findFranchiseSections(
        getFranchises(),
        FRANCHISES_PER_SECTION
    );

    return (
        <>
            <PageIntro title="Did the sequels hold up?">
                How film series are rated movie by movie, from the original to
                the latest sequel.
            </PageIntro>
            {sections.map((section) => (
                <HomeSection
                    key={section.slug}
                    title={section.title}
                    description={section.description}
                    href={`/movies/lists/${section.slug}/`}
                >
                    <FranchiseGrid franchises={section.items} />
                </HomeSection>
            ))}
        </>
    );
}
