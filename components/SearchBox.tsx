'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    type KeyboardEvent,
    useEffect,
    useEffectEvent,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { formatYears } from '@/lib/format';
import { search } from '@/lib/searchIndex';
import { useSearchIndex } from '@/lib/useSearchIndex';
import { Poster } from './Poster';
import { Sparkline } from './Sparkline';
import css from './searchBox.module.css';

const MAX_SUGGESTIONS = 6;

const PARTS = { series: 'seasons', movies: 'movies' } as const;

const searchHref = (query: string) =>
    `/search/?q=${encodeURIComponent(query.trim())}`;

/** Typing goes there, so "/" is just a character. */
const isEditable = (target: EventTarget | null) =>
    target instanceof Element &&
    target.closest('input, textarea, select, [contenteditable]') !== null;

/**
 * The search box in the header, with suggestions to pick from with the
 * arrow keys as you type. "/" anywhere on the page jumps to it.
 */
export function SearchBox() {
    const router = useRouter();
    const input = useRef<HTMLInputElement>(null);
    const listId = useId();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    // -1 is the text itself, before any suggestion has been picked.
    const [active, setActive] = useState(-1);
    // The index is only fetched once the box has been used.
    const [used, setUsed] = useState(false);
    const { index } = useSearchIndex(used);

    const matches = useMemo(
        () => (index && query.trim() ? search(index, query) : []),
        [index, query]
    );
    const suggestions = matches.slice(0, MAX_SUGGESTIONS);
    const options = [
        ...suggestions.map((entry) => ({
            href: `/${entry.type === 'series' ? 'shows' : 'movies'}/${entry.id}/`,
            entry,
        })),
        // Last, where the list ends: everything that matched.
        ...(matches.length > 0
            ? [{ href: searchHref(query), entry: null }]
            : []),
    ];
    const showList = open && query.trim() !== '' && index !== null;
    const optionId = (i: number) => `${listId}-${i}`;

    const close = () => {
        setOpen(false);
        setActive(-1);
    };

    /** Done with the box, as when a suggestion opens its page. */
    const finish = () => {
        close();
        setQuery('');
        input.current?.blur();
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.nativeEvent.isComposing) return;
        const count = options.length;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (count === 0) return;
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }
            // Steps through the suggestions and back to the text, round.
            const step = event.key === 'ArrowDown' ? 1 : -1;
            setActive(((active + 1 + step + count + 1) % (count + 1)) - 1);
        } else if (event.key === 'Enter' && showList && active >= 0) {
            event.preventDefault();
            router.push(options[active].href);
            finish();
        } else if (event.key === 'Escape') {
            // Closes the list, then clears the text, then leaves the box.
            event.preventDefault();
            if (showList) close();
            else if (query) setQuery('');
            else input.current?.blur();
        }
    };

    const onPageKeyDown = useEffectEvent((event: globalThis.KeyboardEvent) => {
        // The character, whichever key types it: Shift+7 on a Swedish
        // keyboard. Ctrl+Alt is AltGr on Windows, which some layouts need.
        if (event.key !== '/' || event.isComposing || event.defaultPrevented) {
            return;
        }
        if (event.metaKey || (event.ctrlKey && !event.altKey)) return;
        if (isEditable(event.target)) return;
        // Also keeps Firefox's quick find, also on "/", from opening.
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
    });

    useEffect(() => {
        window.addEventListener('keydown', onPageKeyDown);
        return () => window.removeEventListener('keydown', onPageKeyDown);
    }, []);

    return (
        <Form
            action="/search/"
            className={css.search}
            role="search"
            onSubmit={close}
        >
            <label htmlFor="search" className="visually-hidden">
                Search series and movies
            </label>
            <svg
                className={css.icon}
                viewBox="0 0 20 20"
                aria-hidden="true"
                focusable="false"
            >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4 4" />
            </svg>
            <input
                ref={input}
                id="search"
                name="q"
                type="search"
                placeholder="Search…"
                autoComplete="off"
                enterKeyHint="search"
                required
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showList}
                aria-controls={listId}
                aria-activedescendant={
                    showList && active >= 0 ? optionId(active) : undefined
                }
                aria-keyshortcuts="/"
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value);
                    setOpen(true);
                    setActive(-1);
                }}
                onFocus={() => {
                    setUsed(true);
                    setOpen(true);
                }}
                onBlur={close}
                onKeyDown={onKeyDown}
            />
            <kbd className={css.key} aria-hidden="true">
                /
            </kbd>
            <div
                id={listId}
                role="listbox"
                aria-label="Suggestions"
                className={css.list}
                hidden={!showList}
                // Keeps the focus in the box, so a click lands on the link
                // before the list closes.
                onMouseDown={(event) => event.preventDefault()}
            >
                {showList && options.length === 0 && (
                    <p className={css.empty}>Nothing matched.</p>
                )}
                {showList &&
                    options.map(({ href, entry }, i) => (
                        <Link
                            key={href}
                            id={optionId(i)}
                            href={href}
                            role="option"
                            aria-selected={i === active}
                            tabIndex={-1}
                            className={entry ? css.option : css.all}
                            onMouseMove={() => setActive(i)}
                            onClick={finish}
                        >
                            {entry ? (
                                <>
                                    <span className={css.poster}>
                                        <Poster
                                            entry={entry}
                                            sizes="36px"
                                            untitled
                                        />
                                    </span>
                                    <span className={css.name}>
                                        <strong>{entry.title}</strong>
                                        <span>
                                            {formatYears(entry)} ·{' '}
                                            {entry.ratings.length}{' '}
                                            {PARTS[entry.type]}
                                        </span>
                                    </span>
                                    <span className={css.spark}>
                                        <Sparkline ratings={entry.ratings} />
                                    </span>
                                </>
                            ) : (
                                <>See all results for “{query.trim()}”</>
                            )}
                        </Link>
                    ))}
            </div>
        </Form>
    );
}
