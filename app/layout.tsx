import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SyncAgent } from '@/components/SyncAgent';
import { openGraph } from '@/lib/openGraph';
import { SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'Season-o-meter: TV Show Ratings, Season by Season',
        template: '%s · Season-o-meter',
    },
    description:
        'See how TV series are rated season by season, and film series movie by movie: where they peaked and where they went downhill.',
    openGraph: openGraph(
        '/og.png',
        'Season-o-meter: how TV series are rated season by season, and film series movie by movie'
    ),
    twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html lang="en">
            <body>
                <Header />
                <main>{children}</main>
                <Footer />
                <SyncAgent />
            </body>
        </html>
    );
}
