import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageIntro } from '@/components/PageIntro';
import { ShowGrid } from '@/components/ShowGrid';
import { findSections, SECTION_SLUGS } from '@/lib/analysis';
import { getShows } from '@/lib/data';

const SHOWS_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string) =>
    findSections(getShows(), SHOWS_PER_LIST).find(
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
    const section = getSection((await params).slug);
    if (!section) notFound();

    return (
        <>
            <PageIntro title={section.title}>{section.description}</PageIntro>
            <ShowGrid shows={section.shows} />
        </>
    );
}
