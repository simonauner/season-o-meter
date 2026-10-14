import type { ReactNode } from 'react';
import css from './pageIntro.module.css';

export function PageIntro({
    title,
    action,
    children,
}: {
    title: string;
    /** Shown at the end of the title's line, such as a button. */
    action?: ReactNode;
    children?: ReactNode;
}) {
    return (
        <div className={css.intro}>
            {action ? (
                <div className={css.heading}>
                    <h1>{title}</h1>
                    {action}
                </div>
            ) : (
                <h1>{title}</h1>
            )}
            {children && <p>{children}</p>}
        </div>
    );
}
