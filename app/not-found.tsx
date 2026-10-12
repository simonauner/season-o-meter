import Link from 'next/link';
import { PageIntro } from '@/components/PageIntro';

export default function NotFound() {
    return (
        <PageIntro title="Not found">
            We couldn&apos;t find that page.{' '}
            <Link href="/">Go to the front page</Link>.
        </PageIntro>
    );
}
