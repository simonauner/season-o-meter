import type { Metadata } from 'next';
import { MyList } from './MyList';

export const metadata: Metadata = {
    title: 'My list',
    // Filled in from the visitor's own browser, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return <MyList />;
}
