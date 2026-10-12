import type { Metadata } from 'next';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { HomeSection } from '@/components/HomeSection';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import {
    FilteredHomeSections,
    RatedFilterPicker,
} from '@/components/RatedFilter';
import { getFranchises } from '@/lib/data';
import { findFranchiseSections } from '@/lib/franchiseAnalysis';
import { forEachMinCount } from '@/lib/minCount';
import css from '../home.module.css';

const FRANCHISES_PER_SECTION = 6;

export const metadata: Metadata = {
    title: 'Movies',
    description:
        'See how film series are rated movie by movie: did the sequels live up to the original?',
};

export default function Page() {
    const variants = forEachMinCount((minMovies) =>
        findFranchiseSections(
            getFranchises(),
            FRANCHISES_PER_SECTION,
            minMovies
        ).map((section) => (
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
        <>
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
        </>
    );
}
