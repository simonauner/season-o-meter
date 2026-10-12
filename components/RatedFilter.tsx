'use client';

import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import type { HomeSections } from '@/lib/homeSections';
import { storedChoice } from '@/lib/storedChoice';
import { ratedIds } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import { useStaticJson } from '@/lib/useStaticJson';
import { ChoicePicker } from './ChoicePicker';
import { HomeSection } from './HomeSection';
import { useMinSeasons } from './MinSeasonsFilter';
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
 * The front page's sections. Until the visitor filters by their own ratings,
 * these are the ones rendered at build time.
 */
export function FilteredHomeSections({
    all,
    limit,
}: {
    all: ReactNode;
    /** Series per section. */
    limit: number;
}) {
    const filter = ratedFilter.useChoice();
    return filter === 'any' ? (
        all
    ) : (
        <SectionsByRating rated={filter === 'yes'} limit={limit} />
    );
}

/** Each section's best matches among the series the visitor has rated, or not. */
function SectionsByRating({ rated, limit }: { rated: boolean; limit: number }) {
    const minSeasons = useMinSeasons();
    const data = useUserData();
    const { data: home, failed } = useStaticJson<HomeSections>(
        '/home-sections.json'
    );

    const sections = useMemo(() => {
        if (!data || !home) return null;
        const ids = ratedIds(data);
        return home.sections[minSeasons].map((section) => ({
            ...section,
            items: section.items
                .filter((id) => ids.has(id) === rated)
                .slice(0, limit),
        }));
    }, [data, home, minSeasons, rated, limit]);

    if (failed) {
        return <p className={css.status}>Could not load the sections.</p>;
    }
    if (!home || !sections) {
        return <p className={css.status}>Loading…</p>;
    }
    if (rated && sections.every((section) => section.items.length === 0)) {
        return (
            <p className={css.status}>
                You haven&apos;t rated any of these series yet. Rate a series or
                its seasons on its page, or import your IMDb ratings on{' '}
                <Link href="/mine/">My list</Link>.
            </p>
        );
    }

    return sections.map((section) => (
        <HomeSection
            key={section.slug}
            title={section.title}
            description={section.description}
            href={`/lists/${section.slug}/`}
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
                        ? 'None of the series you have rated.'
                        : 'You have rated all of them.'}
                </p>
            )}
        </HomeSection>
    ));
}
