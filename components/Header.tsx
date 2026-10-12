import Form from 'next/form';
import Link from 'next/link';
import { Suspense } from 'react';
import { NavLinkList, NavLinks } from './NavLinks';
import css from './header.module.css';

export function Header() {
    return (
        <header className={css.header}>
            <div className={css.inner}>
                <Link href="/" className={css.logo}>
                    Season-o-meter
                </Link>
                <Suspense fallback={<NavLinkList />}>
                    <NavLinks />
                </Suspense>
                <Form action="/search" className={css.search} role="search">
                    <label htmlFor="search" className="visually-hidden">
                        Search series
                    </label>
                    <input
                        id="search"
                        name="q"
                        type="search"
                        placeholder="Search series…"
                        autoComplete="off"
                        required
                    />
                </Form>
            </div>
        </header>
    );
}
