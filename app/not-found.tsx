import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';

export default function NotFound() {
    return (
        <PageIntro title="Not found">
            We couldn&apos;t find that series.{' '}
            <Link href="/">Go to trending</Link>.
        </PageIntro>
    );
}
