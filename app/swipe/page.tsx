import type { Metadata } from 'next';
import { Swipe } from './Swipe';

export const metadata: Metadata = { title: 'Swipe' };

export default function Page() {
    return <Swipe />;
}
