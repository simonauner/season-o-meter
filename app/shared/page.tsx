import type { Metadata } from 'next';
import { SharedList } from './SharedList';

export const metadata: Metadata = {
    title: 'Shared list',
    // Every shared list is on the same page, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return <SharedList />;
}
