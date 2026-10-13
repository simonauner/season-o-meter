import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import { getFranchises } from '@/lib/data';
import {
    findFranchiseSections,
    FRANCHISE_SECTION_SLUGS,
} from '@/lib/franchiseAnalysis';
import { forEachMinCount, type MinCount } from '@/lib/minCount';
import css from '../../../lists/[slug]/list.module.css';

const FRANCHISES_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return FRANCHISE_SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string, minMovies?: MinCount) =>
    findFranchiseSections(getFranchises(), FRANCHISES_PER_LIST, minMovies).find(
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
            <MinCountPicker kind="movies" />
            <div className={css.list}>
                <ByMinCount
                    kind="movies"
                    variants={forEachMinCount((minMovies) => (
                        <FranchiseGrid
                            franchises={sections[minMovies].items}
                            hideVerdicts={sections[minMovies].sharedVerdict}
                        />
                    ))}
                />
            </div>
        </>
    );
}
