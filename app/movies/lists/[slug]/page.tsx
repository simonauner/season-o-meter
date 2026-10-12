import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FranchiseGrid } from '@/components/FranchiseGrid';
import { PageIntro } from '@/components/PageIntro';
import { getFranchises } from '@/lib/data';
import {
    findFranchiseSections,
    FRANCHISE_SECTION_SLUGS,
} from '@/lib/franchiseAnalysis';

const FRANCHISES_PER_LIST = 24;

export const dynamicParams = false;

export function generateStaticParams() {
    return FRANCHISE_SECTION_SLUGS.map((slug) => ({ slug }));
}

const getSection = (slug: string) =>
    findFranchiseSections(getFranchises(), FRANCHISES_PER_LIST).find(
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
    const section = getSection((await params).slug);
    if (!section) notFound();

    return (
        <>
            <PageIntro title={section.title}>{section.description}</PageIntro>
            <FranchiseGrid franchises={section.items} />
        </>
    );
}
