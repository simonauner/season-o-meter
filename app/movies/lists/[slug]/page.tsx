import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import { FilteredList, RatedFilterPicker } from '@/components/RatedFilter';
import { getFranchises } from '@/lib/data';
import {
    findFranchiseSections,
    FRANCHISE_SECTION_SLUGS,
} from '@/lib/franchiseAnalysis';
import { forEachMinCount, type MinCount } from '@/lib/minCount';
import homeCss from '../../../home.module.css';
import css from '../../../lists/[slug]/list.module.css';

/** Shown at first, and how many more each "Show more" adds. */
const FRANCHISES_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return FRANCHISE_SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string, minMovies?: MinCount) =>
    findFranchiseSections(getFranchises(), Infinity, minMovies).find(
        (section) => section.slug === slug
    );

export async function generateMetadata({
    params,
}: PageProps<'/movies/lists/[slug]'>): Promise<Metadata> {
    const section = getSection((await params).slug);
    return section
        ? { title: section.title, description: section.description }
        : {};
}

export default async function Page({
    params,
}: PageProps<'/movies/lists/[slug]'>) {
    const { slug } = await params;
    if (!FRANCHISE_SECTION_SLUGS.includes(slug)) notFound();
    const sections = forEachMinCount((minMovies) =>
        getSection(slug, minMovies)!
    );

    return (
        <>
            <ByMinCount
                kind="movies"
                variants={forEachMinCount((minMovies) => (
                    <PageIntro title={sections[minMovies].title}>
                        {sections[minMovies].description}
                    </PageIntro>
                ))}
            />
            <div className={homeCss.filters}>
                <MinCountPicker kind="movies" />
                <RatedFilterPicker />
            </div>
            <div className={css.list}>
                <FilteredList
                    kind="movies"
                    slug={slug}
                    all={
                        <ByMinCount
                            kind="movies"
                            variants={forEachMinCount((minMovies) => (
                                <FranchiseGrid
                                    franchises={sections[minMovies].items.slice(
                                        0,
                                        FRANCHISES_PER_LIST
                                    )}
                                    hideVerdicts={
                                        sections[minMovies].sharedVerdict
                                    }
                                />
                            ))}
                        />
                    }
                    totals={forEachMinCount(
                        (minMovies) => sections[minMovies].items.length
                    )}
                    limit={FRANCHISES_PER_LIST}
                />
            </div>
        </>
    );
}
