import Link from 'next/link';
import type { ComponentProps } from 'react';
import css from './button.module.css';

type Look = {
    /**
     * Outlined for most buttons, tonal for the main choice, and red for
     * removing something: outlined to ask, filled to do it.
     */
    variant?: 'outlined' | 'tonal' | 'danger' | 'danger-filled';
    /** Small next to a rating, medium in panels, large on its own. */
    size?: 'small' | 'medium' | 'large';
};

const classes = (
    { variant = 'outlined', size = 'medium' }: Look,
    className?: string
) => [css.button, css[variant], css[size], className].filter(Boolean).join(' ');

/** The site's pill button. A page adds its layout with `className`. */
export function Button({
    variant,
    size,
    className,
    type = 'button',
    ...props
}: Look & ComponentProps<'button'>) {
    return (
        <button
            type={type}
            className={classes({ variant, size }, className)}
            {...props}
        />
    );
}

/** A link that looks like `Button`, to a page here or elsewhere. */
export function ButtonLink({
    variant,
    size,
    className,
    href,
    ...props
}: Look & ComponentProps<'a'> & { href: string }) {
    const look = classes({ variant, size }, className);
    return href.startsWith('/') ? (
        <Link href={href} className={look} {...props} />
    ) : (
        <a href={href} className={look} {...props} />
    );
}
