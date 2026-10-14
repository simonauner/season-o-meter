import type { Metadata } from 'next';
import { FeaturedShow } from '@/components/FeaturedShow';
import { Hero } from '@/components/Hero';
import { HomeSection } from '@/components/HomeSection';
import { ByMinCount, MinCountPicker } from '@/components/MinCountFilter';
import { PageIntro } from '@/components/PageIntro';
import {
    FilteredHomeSections,
    RatedFilterPicker,
} from '@/components/RatedFilter';
import { Reveal } from '@/components/Reveal';
import { ShowGrid } from '@/components/ShowGrid';
import { HomeTop, type PeakExample } from '@/components/Welcome';
import { findShowSections, ratedSeasons } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { DEFAULT_MIN_COUNT, forEachMinCount } from '@/lib/minCount';
import { topOfEachSection } from '@/lib/sections';
import css from './home.module.css';

const SHOWS_PER_SECTION = 6;

export const metadata: Metadata = { alternates: { canonical: '/' } };

export default function Page() {
    const sectionsByMinSeasons = forEachMinCount((minSeasons) =>
        findShowSections(getShows(), SHOWS_PER_SECTION, minSeasons)
    );

    // The hero picks one of the series that top a section.
    const featured = forEachMinCount((minSeasons) =>
        topOfEachSection(sectionsByMinSeasons[minSeasons]).map(
            ({ section, item }) => (
                <FeaturedShow
                    key={item.id}
                    show={item}
                    eyebrow={`No. 1 in ${section.title}`}
                />
            )
        )
    );

    // The welcome draws the best-known series that collapsed at the end.
    const collapsed = sectionsByMinSeasons[DEFAULT_MIN_COUNT.series]
        .find((section) => section.slug === 'house-of-cards')
        ?.items.toSorted((a, b) => b.votes - a.votes)[0];
    const example: PeakExample | undefined = collapsed && {
        title: collapsed.title,
        href: `/shows/${collapsed.id}/`,
        seasons: ratedSeasons(collapsed.seasons).map(
            ({ seasonNumber, rating }) => ({ seasonNumber, rating })
        ),
    };

    // And the best-rated of the most popular, to start a watchlist with.
    const picks = getShows()
        .filter((show) => show.id !== collapsed?.id)
        .toSorted((a, b) => b.votes - a.votes)
        .slice(0, 20)
        .toSorted((a, b) => b.rating - a.rating)
        .slice(0, 3)
        .map((show) => ({
            type: 'series' as const,
            id: show.id,
            title: show.title,
            startYear: show.startYear,
            endYear: show.endYear,
            ratings: ratedSeasons(show.seasons).map(({ rating }) => rating),
            poster: show.poster,
        }));

    const variants = forEachMinCount((minSeasons) =>
        sectionsByMinSeasons[minSeasons].map((section) => (
            <HomeSection
                key={section.slug}
                title={section.title}
                description={section.description}
                href={`/lists/${section.slug}/`}
            >
                <ShowGrid shows={section.items} />
            </HomeSection>
        ))
    );

    return (
        <Reveal>
            <HomeTop
                hero={
                    <Hero
                        kind="series"
                        label="Featured series"
                        variants={featured}
                    />
                }
                intro={
                    <PageIntro title="Where did it peak?">
                        How TV series are rated season by season, and where they
                        went downhill.
                    </PageIntro>
                }
                example={example}
                picks={picks}
            />
            <div className={css.filters}>
                <MinCountPicker kind="series" />
                <RatedFilterPicker />
            </div>
            <FilteredHomeSections
                kind="series"
                all={<ByMinCount kind="series" variants={variants} />}
                limit={SHOWS_PER_SECTION}
            />
        </Reveal>
    );
}
