'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import css from './header.module.css';

const LINKS = [
    {
        href: '/',
        label: 'Series',
        isActive: (path: string) =>
            path === '/' || /^\/(lists|shows)\//.test(path),
    },
    {
        href: '/movies/',
        label: 'Movies',
        isActive: (path: string) => path.startsWith('/movies/'),
    },
    {
        href: '/mine/',
        label: 'My list',
        isActive: (path: string) => /^\/(mine|shared)\//.test(path),
    },
];

export function NavLinks() {
    const pathname = usePathname();

    return (
        <nav aria-label="Main" className={css.nav}>
            {LINKS.map(({ href, label, isActive }) => (
                <Link
                    key={href}
                    href={href}
                    className={css.navLink}
                    aria-current={isActive(pathname) ? 'page' : undefined}
                >
                    {label}
                </Link>
            ))}
        </nav>
    );
}
