'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import css from './header.module.css';

const LINKS = [
    { href: '/', label: 'Trending' },
    { href: '/popular', label: 'Popular' },
    { href: '/top-rated', label: 'Top rated' },
] as const;

export function NavLinks() {
    return <NavLinkList pathname={usePathname()} />;
}

/** Renders the links; without a pathname no link is marked as current. */
export function NavLinkList({ pathname }: { pathname?: string }) {
    return (
        <nav className={css.nav} aria-label="Lists">
            {LINKS.map(({ href, label }) => (
                <Link
                    key={href}
                    href={href}
                    className={css.navLink}
                    aria-current={pathname === href ? 'page' : undefined}
                >
                    {label}
                </Link>
            ))}
        </nav>
    );
}
