import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageIntro } from '@/components/PageIntro';
import { PersonGrid } from '@/components/PersonGrid';
import { getPeople } from '@/lib/data';
import { peopleInRole, ROLE_LISTS } from '@/lib/people';
import css from '../../../lists/[slug]/list.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
    return ROLE_LISTS.map(({ slug }) => ({ slug }));
}

const getList = (slug: string) => ROLE_LISTS.find((list) => list.slug === slug);

export async function generateMetadata({
    params,
}: PageProps<'/people/lists/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const list = getList(slug);
    return list
        ? {
              title: list.searchTitle,
              description: list.description,
              alternates: { canonical: `/people/lists/${slug}/` },
          }
        : {};
}

export default async function Page({
    params,
}: PageProps<'/people/lists/[slug]'>) {
    const list = getList((await params).slug);
    if (!list) notFound();

    return (
        <>
            <PageIntro title={list.title}>{list.description}</PageIntro>
            <div className={css.list}>
                <PersonGrid
                    people={peopleInRole(getPeople(), list.role).map(
                        (person) => ({ person })
                    )}
                />
            </div>
        </>
    );
}
