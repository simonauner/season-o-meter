import type { Metadata } from 'next';
import { HomeSection } from '@/components/HomeSection';
import { PageIntro } from '@/components/PageIntro';
import { PersonGrid } from '@/components/PersonGrid';
import { getPeople } from '@/lib/data';
import { peopleInRole, ROLE_LISTS } from '@/lib/people';

const PEOPLE_PER_SECTION = 6;

export const metadata: Metadata = {
    title: 'Directors, Writers and Actors, Every Movie Rated',
    description:
        'See how the movies of the most popular directors, writers and actors are rated, from their first to their latest.',
    alternates: { canonical: '/people/' },
};

export default function Page() {
    const people = getPeople();

    return (
        <>
            <PageIntro title="Still got it?">
                How the movies of the most popular directors, writers and actors
                are rated, from their first to their latest.
            </PageIntro>
            {ROLE_LISTS.map((list) => (
                <HomeSection
                    key={list.slug}
                    title={list.title}
                    description={list.description}
                    href={`/people/lists/${list.slug}/`}
                >
                    <PersonGrid
                        people={peopleInRole(people, list.role)
                            .slice(0, PEOPLE_PER_SECTION)
                            .map((person) => ({ person }))}
                    />
                </HomeSection>
            ))}
        </>
    );
}
