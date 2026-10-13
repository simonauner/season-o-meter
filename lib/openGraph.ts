import type { Metadata } from 'next';

/** The size link previews show, per the Open Graph convention. */
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * Open Graph metadata with a link preview image drawn by an og.png route
 * (lib/ogImage.tsx). Next fills in the title and description from the
 * page's own, and the Twitter card from these.
 */
export const openGraph = (
    image: string,
    alt: string
): Metadata['openGraph'] => ({
    siteName: 'Season-o-meter',
    type: 'website',
    images: [{ url: image, ...OG_SIZE, alt, type: 'image/png' }],
});
