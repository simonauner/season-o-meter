import { FeaturedShow } from '@/components/FeaturedShow';
import { Hero } from '@/components/Hero';
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

/** The hero picks one of this many from the top of "Most popular". */
const FEATURED_CANDIDATES = 3;

export default function Page() {
    const sectionsByMinSeasons = forEachMinSeasons((minSeasons) =>
        findShowSections(getShows(), SHOWS_PER_SECTION, minSeasons)
    );

    const featured = forEachMinSeasons((minSeasons) => {
        const popular = sectionsByMinSeasons[minSeasons].find(
            (section) => section.slug === 'most-popular'
        );
        if (!popular) return [];
        return popular.items
            .slice(0, FEATURED_CANDIDATES)
            .map((show, i) => (
                <FeaturedShow
                    key={show.id}
                    show={show}
                    eyebrow={`No. ${i + 1} in ${popular.title}`}
                />
            ));
    });

    const variants = forEachMinSeasons((minSeasons) =>
        sectionsByMinSeasons[minSeasons].map((section) => (
            <HomeSection
                key={section.slug}
                title={section.title}
                description={section.description}
                href={`/lists/${section.slug}/`}
            >
                <ShowGrid shows={section.items} />
            </HomeSection>
        ))
    );

    return (
        <>
            <Hero label="Featured series" variants={featured} />
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
