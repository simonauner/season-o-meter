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
    {
        href: '/friends/',
        label: 'Friends',
        isActive: (path: string) => path.startsWith('/friends/'),
    },
    {
        href: '/swipe/',
        label: 'Swipe',
        isActive: (path: string) => path.startsWith('/swipe/'),
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

export function ProfileLink() {
    const pathname = usePathname();

    return (
        <Link
            href="/profile/"
            className={css.profile}
            aria-current={pathname.startsWith('/profile/') ? 'page' : undefined}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="8.5" r="4" />
                <path d="M4.5 20c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" />
            </svg>
            <span className="visually-hidden">Profile</span>
        </Link>
    );
}
