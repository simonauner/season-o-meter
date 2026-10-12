import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ByMinSeasons, MinSeasonsPicker } from '@/components/MinSeasonsFilter';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid } from '@/components/ShowGrid';
import { findSections, SECTION_SLUGS } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { forEachMinSeasons, type MinSeasons } from '@/lib/minSeasons';
import css from './list.module.css';

const SHOWS_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string, minSeasons?: MinSeasons) =>
    findSections(getShows(), SHOWS_PER_LIST, minSeasons).find(
        (section) => section.slug === slug
    );

export async function generateMetadata({
    params,
}: PageProps<'/lists/[slug]'>): Promise<Metadata> {
    const section = getSection((await params).slug);
    return section
        ? { title: section.title, description: section.description }
        : {};
}

export default async function Page({ params }: PageProps<'/lists/[slug]'>) {
    const { slug } = await params;
    if (!SECTION_SLUGS.includes(slug)) notFound();
    const sections = forEachMinSeasons((minSeasons) =>
        getSection(slug, minSeasons)!
    );

    return (
        <>
            <ByMinSeasons
                variants={forEachMinSeasons((minSeasons) => (
                    <PageIntro title={sections[minSeasons].title}>
                        {sections[minSeasons].description}
                    </PageIntro>
                ))}
            />
            <MinSeasonsPicker />
            <div className={css.list}>
                <ByMinSeasons
                    variants={forEachMinSeasons((minSeasons) => (
                        <ShowGrid shows={sections[minSeasons].shows} />
                    ))}
                />
            </div>
        </>
    );
}
