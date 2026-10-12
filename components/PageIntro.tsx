import type { ReactNode } from 'react';
import css from './pageIntro.module.css';

export function PageIntro({
    title,
    children,
}: {
    title: string;
    children?: ReactNode;
}) {
    return (
        <div className={css.intro}>
            <h1>{title}</h1>
            {children && <p>{children}</p>}
        </div>
    );
}
