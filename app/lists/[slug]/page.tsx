import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import { FilteredList, RatedFilterPicker } from '@/components/RatedFilter';
import { ShowGrid } from '@/components/ShowGrid';
import { findShowSections, SHOW_SECTION_SLUGS } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { forEachMinCount, type MinCount } from '@/lib/minCount';
import homeCss from '../../home.module.css';
import css from './list.module.css';

const SHOWS_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return SHOW_SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string, minSeasons?: MinCount) =>
    findShowSections(getShows(), SHOWS_PER_LIST, minSeasons).find(
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
    if (!SHOW_SECTION_SLUGS.includes(slug)) notFound();
    const sections = forEachMinCount((minSeasons) =>
        getSection(slug, minSeasons)!
    );

    return (
        <>
            <ByMinCount
                kind="series"
                variants={forEachMinCount((minSeasons) => (
                    <PageIntro title={sections[minSeasons].title}>
                        {sections[minSeasons].description}
                    </PageIntro>
                ))}
            />
            <div className={homeCss.filters}>
                <MinCountPicker kind="series" />
                <RatedFilterPicker />
            </div>
            <div className={css.list}>
                <FilteredList
                    kind="series"
                    slug={slug}
                    all={
                        <ByMinCount
                            kind="series"
                            variants={forEachMinCount((minSeasons) => (
                                <ShowGrid
                                    shows={sections[minSeasons].items}
                                    hideVerdicts={
                                        sections[minSeasons].sharedVerdict
                                    }
                                />
                            ))}
                        />
                    }
                    limit={SHOWS_PER_LIST}
                />
            </div>
        </>
    );
}
