import type { Metadata } from 'next';
import { MyList } from './MyList';

export const metadata: Metadata = { title: 'My list' };

export default function Page() {
    return <MyList />;
}
