'use client';

import {
    type KeyboardEvent,
    type ReactNode,
    useEffect,
    useId,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { Kind, MinCount } from '@/lib/minCount';
import { storedChoice } from '@/lib/storedChoice';
import { useMinCount } from './MinCountFilter';
import css from './hero.module.css';

const visibility = storedChoice(
    'season-o-meter:hero',
    ['shown', 'hidden'] as const,
    'shown'
);

const hide = () => visibility.set('hidden');

/** Drawn once per page load, so the pick stays put when the filter changes. */
let pick: number | null = null;

const getPick = () => (pick ??= Math.random());

// The pick never changes, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

const usePick = () =>
    useSyncExternalStore<number | null>(subscribeNever, getPick, () => null);

/**
 * A featured item, picked at random in the browser from the candidates
 * rendered for the visitor's chosen minimum. The visitor can hide it.
 */
export function Hero({
    kind,
    label,
    variants,
}: {
    /** Whose minimum picks the candidates. */
    kind: Kind;
    /** Accessible name of the section. */
    label: string;
    variants: Record<MinCount, ReactNode[]>;
}) {
    const candidates = variants[useMinCount(kind)];
    // Nothing is drawn until both are known in the browser.
    const shown = visibility.useStoredChoice();
    const random = usePick();

    if (shown !== 'shown' || random === null || candidates.length === 0) {
        return null;
    }

    return (
        <section className={css.hero} aria-label={label}>
            {candidates[Math.floor(random * candidates.length)]}
            <HeroMenu />
        </section>
    );
}

function HeroMenu() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) return;
        firstItemRef.current?.focus();
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const close = () => {
        setOpen(false);
        buttonRef.current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div ref={rootRef} className={css.menuRoot} onKeyDown={onKeyDown}>
            <button
                ref={buttonRef}
                type="button"
                className={css.menuButton}
                aria-label="More options"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                onClick={() => setOpen((current) => !current)}
            >
                {/* Lucide's ellipsis-vertical. */}
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                </svg>
            </button>
            {open && (
                <div id={menuId} role="menu" className={css.menu}>
                    <button
                        ref={firstItemRef}
                        type="button"
                        role="menuitem"
                        className={css.menuItem}
                        onClick={hide}
                    >
                        Hide this section
                    </button>
                </div>
            )}
        </div>
    );
}
