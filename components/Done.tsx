import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import css from './done.module.css';

type DoneIconProps = {
    /** Gleams once when it appears. */
    gleam?: boolean;
    onGleamEnd?: () => void;
    className?: string;
};

/** A check for something that's done, in the color of the text around it. */
export function DoneIcon({
    gleam = true,
    onGleamEnd,
    className,
}: DoneIconProps) {
    return (
        <span
            className={[css.icon, gleam && css.gleam, className]
                .filter(Boolean)
                .join(' ')}
            aria-hidden
        >
            <CircleCheck strokeWidth={2.5} />
            {/* A lighter copy of the check, shown only where the gleam
                passes over it. */}
            {gleam && (
                <CircleCheck
                    className={css.shine}
                    strokeWidth={2.5}
                    onAnimationEnd={onGleamEnd}
                />
            )}
        </span>
    );
}

/** Says that something is done, right after the button that did it. */
export function Done({ children }: { children: ReactNode }) {
    return (
        <span className={css.done} role="status">
            <DoneIcon />
            {/* One piece of text, however many parts it has. */}
            <span>{children}</span>
        </span>
    );
}
