import type { Metadata } from 'next';
import { Friends } from './Friends';

export const metadata: Metadata = {
    title: 'Friends',
    // Filled in from the visitor's own browser, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return <Friends />;
}
