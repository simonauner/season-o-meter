'use client';

import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import { setHistoryState, useHistoryState } from '@/lib/historyState';
import type { HomeSections } from '@/lib/homeSections';
import type { Kind, MinCount } from '@/lib/minCount';
import { storedChoice } from '@/lib/storedChoice';
import { ratedIds } from '@/lib/userData';
import { useUserData } from '@/lib/userStore';
import { useStaticJson } from '@/lib/useStaticJson';
import { Button } from './Button';
import { ChoicePicker } from './ChoicePicker';
import { HomeSection } from './HomeSection';
import { useMinCount } from './MinCountFilter';
import { TrendGrid } from './TrendGrid';
import css from './homeSection.module.css';

const RATED_FILTERS = ['any', 'yes', 'no'] as const;

type RatedFilter = (typeof RATED_FILTERS)[number];

const ratedFilter = storedChoice<RatedFilter>(
    'season-o-meter:rated',
    RATED_FILTERS,
    'any'
);

// Judged by what the visitor has rated.
const OPTIONS = [
    { value: 'any', label: 'Any' },
    { value: 'yes', label: 'Rated' },
    { value: 'no', label: 'Not rated' },
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

/** How many of a list's items are shown, and with which filters. */
type Shown = { filters: string; shown: number };

const SHOWN_KEY = 'season-o-meter:shown';

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

/**
 * A list page's items, a page at a time. Until the visitor filters by their
 * own ratings or asks for more, these are the first ones, rendered at build
 * time.
 */
export function FilteredList({
    kind,
    slug,
    all,
    totals,
    limit,
}: {
    kind: Kind;
    slug: string;
    all: ReactNode;
    /** Items in the whole list, per chosen minimum. */
    totals: Record<MinCount, number>;
    /** Items per page. */
    limit: number;
}) {
    const filter = ratedFilter.useChoice();
    const minCount = useMinCount(kind);
    // Changing a filter starts over from the first page.
    const filters = `${filter}:${minCount}`;
    // Kept with the page in the history, so that coming back from a title
    // still shows it.
    const more = useHistoryState(SHOWN_KEY) as Shown | null;
    const shown = more?.filters === filters ? more.shown : limit;
    const showMore = () =>
        setHistoryState(SHOWN_KEY, {
            filters,
            shown: shown + limit,
        } satisfies Shown);

    if (filter === 'any' && shown === limit) {
        return (
            <>
                {all}
                {totals[minCount] > limit && <ShowMore onClick={showMore} />}
            </>
        );
    }
    return (
        <ListByRating
            kind={kind}
            slug={slug}
            rated={filter === 'any' ? null : filter === 'yes'}
            limit={shown}
            onShowMore={showMore}
            // Keeps the first page up while the rest of the list loads.
            loading={filter === 'any' ? all : undefined}
        />
    );
}

function ShowMore({ onClick }: { onClick: () => void }) {
    return (
        <Button size="large" className={css.showMore} onClick={onClick}>
            Show more
        </Button>
    );
}

/**
 * Each section's best matches among what the visitor has rated, or not, or
 * among everything when `rated` is null.
 */
function useSectionsByRating(kind: Kind, rated: boolean | null, limit: number) {
    const minCount = useMinCount(kind);
    const data = useUserData();
    const { data: home, failed } = useStaticJson<HomeSections>(
        KINDS[kind].json
    );

    const sections = useMemo(() => {
        if (!data || !home) return null;
        const ids = ratedIds(data);
        // A film series counts as rated when any of its movies is.
        const isRated = (id: string) =>
            ids.has(id) ||
            (home.movieIds?.[id] ?? []).some((movieId) => ids.has(movieId));
        return home.sections[minCount].map((section) => {
            const items =
                rated === null
                    ? section.items
                    : section.items.filter((id) => isRated(id) === rated);
            return {
                ...section,
                total: items.length,
                items: items.slice(0, limit),
            };
        });
    }, [data, home, minCount, rated, limit]);

    return { home, sections, failed };
}

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
    const { home, sections, failed } = useSectionsByRating(kind, rated, limit);

    if (failed) {
        return <p className={css.status}>Could not load the sections.</p>;
    }
    if (!home || !sections) {
        return <p className={css.status}>Loading…</p>;
    }
    if (rated && sections.every((section) => section.items.length === 0)) {
        return <NoneRated kind={kind} />;
    }

    return sections.map((section) => (
        <HomeSection
            key={section.slug}
            title={section.title}
            description={section.description}
            href={`${texts.lists}${section.slug}/`}
        >
            {section.items.length > 0 ? (
                <CardGrid ids={section.items} home={home} />
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

function ListByRating({
    kind,
    slug,
    rated,
    limit,
    onShowMore,
    loading = <p className={css.status}>Loading…</p>,
}: {
    kind: Kind;
    slug: string;
    rated: boolean | null;
    limit: number;
    onShowMore: () => void;
    /** Shown until the list has loaded. */
    loading?: ReactNode;
}) {
    const { home, sections, failed } = useSectionsByRating(kind, rated, limit);
    const section = sections?.find((section) => section.slug === slug);
    const items = section?.items;

    if (failed) {
        return <p className={css.status}>Could not load the list.</p>;
    }
    if (!home || !section || !items) return loading;
    if (items.length === 0) {
        if (rated) return <NoneRated kind={kind} />;
        return (
            <p className={css.status}>
                {rated === false
                    ? 'You have rated all of them.'
                    : 'Nothing matches.'}
            </p>
        );
    }
    return (
        <>
            <CardGrid
                ids={items}
                home={home}
                hideVerdicts={section.sharedVerdict}
            />
            {section.total > items.length && <ShowMore onClick={onShowMore} />}
        </>
    );
}

function NoneRated({ kind }: { kind: Kind }) {
    return (
        <p className={css.status}>
            {KINDS[kind].noneRated}, or import your IMDb ratings on{' '}
            <Link href="/mine/">My list</Link>.
        </p>
    );
}

function CardGrid({
    ids,
    home,
    hideVerdicts,
}: {
    ids: string[];
    home: HomeSections;
    hideVerdicts?: boolean;
}) {
    return (
        <TrendGrid
            cards={ids.map((id) => home.cards[id])}
            hideVerdicts={hideVerdicts}
        />
    );
}
