import type { MetadataRoute } from 'next';
import { SHOW_SECTION_SLUGS } from '@/lib/analysis';
import { getFranchises, getPeople, getShows } from '@/lib/data';
import { FRANCHISE_SECTION_SLUGS } from '@/lib/franchiseAnalysis';
import { ROLE_LISTS } from '@/lib/people';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * Every page worth finding in a search. Most title pages aren't linked from
 * any list, so search engines only find them through here. There's no
 * lastModified: the site is rebuilt every night, but most pages don't change.
 */
export default function sitemap(): MetadataRoute.Sitemap {
    const paths = [
        '/',
        '/movies/',
        '/people/',
        ...SHOW_SECTION_SLUGS.map((slug) => `/lists/${slug}/`),
        ...FRANCHISE_SECTION_SLUGS.map((slug) => `/movies/lists/${slug}/`),
        ...getShows().map((show) => `/shows/${show.id}/`),
        ...getFranchises().map((franchise) => `/movies/${franchise.id}/`),
        ...ROLE_LISTS.map(({ slug }) => `/people/lists/${slug}/`),
        ...getPeople().map((person) => `/people/${person.id}/`),
    ];
    return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
