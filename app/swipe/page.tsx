import type { Metadata } from 'next';
import { Swipe } from './Swipe';

export const metadata: Metadata = {
    title: 'Swipe',
    // Filled in from the visitor's own browser, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return <Swipe />;
}
