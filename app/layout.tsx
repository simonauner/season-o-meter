import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import './globals.css';

export const metadata: Metadata = {
    title: {
        default: 'Season-o-meter',
        template: '%s · Season-o-meter',
    },
    description:
        'See how a TV series is rated season by season: where it peaked and where it went downhill.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
    return (
        <html lang="en">
            <body>
                <Header />
                <main>{children}</main>
                <Footer />
            </body>
        </html>
    );
}
