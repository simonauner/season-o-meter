import { HomeSection } from '@/components/HomeSection';
import { ByMinSeasons, MinSeasonsPicker } from '@/components/MinSeasonsFilter';
import { PageIntro } from '@/components/PageIntro';
import {
    FilteredHomeSections,
    RatedFilterPicker,
} from '@/components/RatedFilter';
import { ShowGrid } from '@/components/ShowGrid';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { forEachMinSeasons } from '@/lib/minSeasons';
import css from './home.module.css';

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
            <div className={css.filters}>
                <MinSeasonsPicker />
                <RatedFilterPicker />
            </div>
            <FilteredHomeSections
                all={<ByMinSeasons variants={variants} />}
                limit={SHOWS_PER_SECTION}
            />
        </>
    );
}
