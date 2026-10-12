import type { TrendCardProps } from '@/components/TrendCard';
import { forEachMinCount, type MinCount } from './minCount';
import type { Section } from './sections';

/**
 * A page's sections with every match, not just the top few, served as
 * /home-sections.json for series and /movies/home-sections.json for film
 * series. Lets the visitor filter them by their own ratings.
 */
export type HomeSections = {
    /** Per chosen minimum number of seasons or movies. Items are ids, best first. */
    sections: Record<MinCount, Section<string>[]>;
    /** The card for every item in any section, by id. */
    cards: Record<string, TrendCardProps>;
    /**
     * The movies of every film series in any section, by id. Rating one of
     * them counts as rating the film series.
     */
    movieIds?: Record<string, string[]>;
};

// Plenty for a sparkline, and keeps the file small.
const roundRating = (rating: number) => Math.round(rating * 100) / 100;

/** Builds the sections and cards for every choice of minimum, at build time. */
export function buildHomeSections<T extends { id: string }>(
    findSections: (minCount: MinCount) => Section<T>[],
    cardProps: (item: T) => TrendCardProps
): Pick<HomeSections, 'sections' | 'cards'> & { items: T[] } {
    const cards: HomeSections['cards'] = {};
    const items: T[] = [];
    const sections = forEachMinCount((minCount) =>
        findSections(minCount).map((section) => {
            for (const item of section.items) {
                if (cards[item.id]) continue;
                const card = cardProps(item);
                cards[item.id] = {
                    ...card,
                    ratings: card.ratings.map(roundRating),
                };
                items.push(item);
            }
            return { ...section, items: section.items.map((item) => item.id) };
        })
    );
    return { sections, cards, items };
}
