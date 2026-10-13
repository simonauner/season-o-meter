import type { Metadata } from 'next';
import { FeaturedFranchise } from '@/components/FeaturedFranchise';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { Hero } from '@/components/Hero';
import { HomeSection } from '@/components/HomeSection';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import {
    FilteredHomeSections,
    RatedFilterPicker,
} from '@/components/RatedFilter';
import { Reveal } from '@/components/Reveal';
import { getFranchises } from '@/lib/data';
import { findFranchiseSections } from '@/lib/franchiseAnalysis';
import { forEachMinCount } from '@/lib/minCount';
import { topOfEachSection } from '@/lib/sections';
import css from '../home.module.css';

const FRANCHISES_PER_SECTION = 6;

export const metadata: Metadata = {
    title: 'Movie Franchises Ranked, Movie by Movie',
    description:
        'See how film series are rated movie by movie: did the sequels live up to the original?',
    alternates: { canonical: '/movies/' },
};

export default function Page() {
    const sectionsByMinMovies = forEachMinCount((minMovies) =>
        findFranchiseSections(
            getFranchises(),
            FRANCHISES_PER_SECTION,
            minMovies
        )
    );

    // The hero picks one of the film series that top a section.
    const featured = forEachMinCount((minMovies) =>
        topOfEachSection(sectionsByMinMovies[minMovies]).map(
            ({ section, item }) => (
                <FeaturedFranchise
                    key={item.id}
                    franchise={item}
                    eyebrow={`No. 1 in ${section.title}`}
                />
            )
        )
    );

    const variants = forEachMinCount((minMovies) =>
        sectionsByMinMovies[minMovies].map((section) => (
            <HomeSection
                key={section.slug}
                title={section.title}
                description={section.description}
                href={`/movies/lists/${section.slug}/`}
            >
                <FranchiseGrid franchises={section.items} />
            </HomeSection>
        ))
    );

    return (
        <Reveal>
            <Hero kind="movies" label="Featured movies" variants={featured} />
            <PageIntro title="Did the sequels hold up?">
                How film series are rated movie by movie, from the original to
                the latest sequel.
            </PageIntro>
            <div className={css.filters}>
                <MinCountPicker kind="movies" />
                <RatedFilterPicker />
            </div>
            <FilteredHomeSections
                kind="movies"
                all={<ByMinCount kind="movies" variants={variants} />}
                limit={FRANCHISES_PER_SECTION}
            />
        </Reveal>
    );
}
