import { showCardProps } from '@/components/ShowCard';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import type { HomeSections } from '@/lib/homeSections';
import { forEachMinSeasons } from '@/lib/minSeasons';

export const dynamic = 'force-static';

// Plenty for a sparkline, and keeps the file small.
const roundRating = (rating: number) => Math.round(rating * 100) / 100;

export function GET() {
    const cards: HomeSections['cards'] = {};
    const sections = forEachMinSeasons((minSeasons) =>
        findShowSections(getShows(), Infinity, minSeasons).map((section) => {
            for (const show of section.items) {
                if (cards[show.id]) continue;
                const card = showCardProps(show);
                cards[show.id] = {
                    ...card,
                    ratings: card.ratings.map(roundRating),
                };
            }
            return { ...section, items: section.items.map((show) => show.id) };
        })
    );
    return Response.json({ sections, cards } satisfies HomeSections);
}
