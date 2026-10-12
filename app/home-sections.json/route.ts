import { showCardProps } from '@/components/ShowCard';
import { findShowSections } from '@/lib/analysis';
import { getShows } from '@/lib/data';
import { buildHomeSections, type HomeSections } from '@/lib/homeSections';

export const dynamic = 'force-static';

export function GET() {
    const { sections, cards } = buildHomeSections(
        (minSeasons) => findShowSections(getShows(), Infinity, minSeasons),
        showCardProps
    );
    return Response.json({ sections, cards } satisfies HomeSections);
}
