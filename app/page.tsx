import { HomeSection } from '@/components/HomeSection';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid } from '@/components/ShowGrid';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';

const SHOWS_PER_SECTION = 6;

export default function Page() {
    const sections = findShowSections(getShows(), SHOWS_PER_SECTION);

    return (
        <>
            <PageIntro title="Where did it peak?">
                How TV series are rated season by season, and where they went
                downhill.
            </PageIntro>
            {sections.map((section) => (
                <HomeSection
                    key={section.slug}
                    title={section.title}
                    description={section.description}
                    href={`/lists/${section.slug}/`}
                >
                    <ShowGrid shows={section.items} />
                </HomeSection>
            ))}
        </>
    );
}
