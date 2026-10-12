import Link from 'next/link';
import type { ReactNode } from 'react';
import css from './homeSection.module.css';

type HomeSectionProps = {
    title: string;
    description: string;
    /** The section's full list. */
    href: string;
    children: ReactNode;
};

export function HomeSection({
    title,
    description,
    href,
    children,
}: HomeSectionProps) {
    return (
        <section className={css.section}>
            <div className={css.heading}>
                <div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
                <Link href={href} className={css.more}>
                    See all
                    <span className="visually-hidden">: {title}</span> →
                </Link>
            </div>
            {children}
        </section>
    );
}
