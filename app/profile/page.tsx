import type { Metadata } from 'next';
import { Profile } from './Profile';

export const metadata: Metadata = {
    title: 'Profile',
    // Filled in from the visitor's own browser, so there's nothing to index.
    robots: { index: false },
};

export default function Page() {
    return <Profile />;
}
