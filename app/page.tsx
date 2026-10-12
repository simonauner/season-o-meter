import { HomeSection } from '@/components/HomeSection';
import { ByMinSeasons, MinSeasonsPicker } from '@/components/MinSeasonsFilter';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid } from '@/components/ShowGrid';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { forEachMinSeasons } from '@/lib/minSeasons';

const SHOWS_PER_SECTION = 6;

export default function Page() {
    const variants = forEachMinSeasons((minSeasons) =>
        findShowSections(getShows(), SHOWS_PER_SECTION, minSeasons).map(
            (section) => (
                <HomeSection
                    key={section.slug}
                    title={section.title}
                    description={section.description}
                    href={`/lists/${section.slug}/`}
                >
                    <ShowGrid shows={section.items} />
                </HomeSection>
            )
        )
    );

    return (
        <>
            <PageIntro title="Where did it peak?">
                How TV series are rated season by season, and where they went
                downhill.
            </PageIntro>
            <MinSeasonsPicker />
            <ByMinSeasons variants={variants} />
        </>
    );
}
