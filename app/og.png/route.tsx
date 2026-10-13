import { siteImage } from '@/lib/ogImage';

export const dynamic = 'force-static';

export function GET() {
    return siteImage();
}
