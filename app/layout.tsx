import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SyncAgent } from '@/components/SyncAgent';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'Season-o-meter',
        template: '%s · Season-o-meter',
    },
    description:
        'See how TV series are rated season by season, and film series movie by movie: where they peaked and where they went downhill.',
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
