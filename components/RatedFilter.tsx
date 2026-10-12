'use client';

import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import type { HomeSections } from '@/lib/homeSections';
import type { Kind } from '@/lib/minCount';
import { storedChoice } from '@/lib/storedChoice';
import { ratedIds } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import { useStaticJson } from '@/lib/useStaticJson';
import { ChoicePicker } from './ChoicePicker';
import { HomeSection } from './HomeSection';
import { useMinCount } from './MinCountFilter';
import { TrendCard } from './TrendCard';
import css from './homeSection.module.css';
import gridCss from './cardGrid.module.css';

const RATED_FILTERS = ['any', 'yes', 'no'] as const;

type RatedFilter = (typeof RATED_FILTERS)[number];

const ratedFilter = storedChoice<RatedFilter>(
    'season-o-meter:rated',
    RATED_FILTERS,
    'any'
);

const OPTIONS = [
    { value: 'any', label: 'Any' },
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
] as const;

const KINDS = {
    series: {
        json: '/home-sections.json',
        lists: '/lists/',
        noneRated:
            'You haven’t rated any of these series yet. Rate a series or its seasons on its page',
        noneInSection: 'None of the series you have rated.',
    },
    movies: {
        json: '/movies/home-sections.json',
        lists: '/movies/lists/',
        noneRated:
            'You haven’t rated any of these film series yet. Rate a film series or its movies on its page',
        noneInSection: 'None of the film series you have rated.',
    },
} satisfies Record<Kind, Record<string, string>>;

export function RatedFilterPicker() {
    return (
        <ChoicePicker
            label="Rated by you"
            options={OPTIONS}
            current={ratedFilter.useStoredChoice()}
            onChange={ratedFilter.set}
        />
    );
}

/**
 * The series or movies page's sections. Until the visitor filters by their own
 * ratings, these are the ones rendered at build time.
 */
export function FilteredHomeSections({
    kind,
    all,
    limit,
}: {
    kind: Kind;
    all: ReactNode;
    /** Items per section. */
    limit: number;
}) {
    const filter = ratedFilter.useChoice();
    return filter === 'any' ? (
        all
    ) : (
        <SectionsByRating kind={kind} rated={filter === 'yes'} limit={limit} />
    );
}

/** Each section's best matches among what the visitor has rated, or not. */
function SectionsByRating({
    kind,
    rated,
    limit,
}: {
    kind: Kind;
    rated: boolean;
    limit: number;
}) {
    const texts = KINDS[kind];
    const minCount = useMinCount(kind);
    const data = useUserData();
    const { data: home, failed } = useStaticJson<HomeSections>(texts.json);

    const sections = useMemo(() => {
        if (!data || !home) return null;
        const ids = ratedIds(data);
        // A film series counts as rated when any of its movies is.
        const isRated = (id: string) =>
            ids.has(id) ||
            (home.movieIds?.[id] ?? []).some((movieId) => ids.has(movieId));
        return home.sections[minCount].map((section) => ({
            ...section,
            items: section.items
                .filter((id) => isRated(id) === rated)
                .slice(0, limit),
        }));
    }, [data, home, minCount, rated, limit]);

    if (failed) {
        return <p className={css.status}>Could not load the sections.</p>;
    }
    if (!home || !sections) {
        return <p className={css.status}>Loading…</p>;
    }
    if (rated && sections.every((section) => section.items.length === 0)) {
        return (
            <p className={css.status}>
                {texts.noneRated}, or import your IMDb ratings on{' '}
                <Link href="/mine/">My list</Link>.
            </p>
        );
    }

    return sections.map((section) => (
        <HomeSection
            key={section.slug}
            title={section.title}
            description={section.description}
            href={`${texts.lists}${section.slug}/`}
        >
            {section.items.length > 0 ? (
                <ul className={gridCss.grid}>
                    {section.items.map((id) => (
                        <li key={id}>
                            <TrendCard {...home.cards[id]} />
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={css.empty}>
                    {rated
                        ? texts.noneInSection
                        : 'You have rated all of them.'}
                </p>
            )}
        </HomeSection>
    ));
}
