import type { Metadata } from 'next';
import { Friends } from './Friends';

export const metadata: Metadata = { title: 'Friends' };

export default function Page() {
    return <Friends />;
}
