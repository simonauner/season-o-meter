import type { Metadata } from 'next';
import { FeaturedShow } from '@/components/FeaturedShow';
import { Hero } from '@/components/Hero';
import { HomeSection } from '@/components/HomeSection';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import {
    FilteredHomeSections,
    RatedFilterPicker,
} from '@/components/RatedFilter';
import { ShowGrid } from '@/components/ShowGrid';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { forEachMinCount } from '@/lib/minCount';
import { topOfEachSection } from '@/lib/sections';
import css from './home.module.css';

const SHOWS_PER_SECTION = 6;

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Page() {
    const sectionsByMinSeasons = forEachMinCount((minSeasons) =>
        findShowSections(getShows(), SHOWS_PER_SECTION, minSeasons)
    );

    // The hero picks one of the series that top a section.
    const featured = forEachMinCount((minSeasons) =>
        topOfEachSection(sectionsByMinSeasons[minSeasons]).map(
            ({ section, item }) => (
                <FeaturedShow
                    key={item.id}
                    show={item}
                    eyebrow={`No. 1 in ${section.title}`}
                />
            )
        )
    );

    const variants = forEachMinCount((minSeasons) =>
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
            <Hero kind="series" label="Featured series" variants={featured} />
            <PageIntro title="Where did it peak?">
                How TV series are rated season by season, and where they went
                downhill.
            </PageIntro>
            <div className={css.filters}>
                <MinCountPicker kind="series" />
                <RatedFilterPicker />
            </div>
            <FilteredHomeSections
                kind="series"
                all={<ByMinCount kind="series" variants={variants} />}
                limit={SHOWS_PER_SECTION}
            />
        </>
    );
}
