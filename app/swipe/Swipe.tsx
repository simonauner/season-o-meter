'use client';

import Link from 'next/link';
import {
    type CSSProperties,
    type PointerEvent,
    useEffect,
    useEffectEvent,
    useId,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { ChoicePicker } from '@/components/ChoicePicker';
import { Poster } from '@/components/Poster';
import { SharedPoster } from '@/components/PosterTransition';
import { formatYears } from '@/lib/format';
import type { SearchEntry } from '@/lib/searchIndex';
import { storedChoice } from '@/lib/storedChoice';
import { deckOrder, entryHref, partsLabel, remaining } from '@/lib/swipeDeck';
import {
    MAX_RATING,
    MIN_RATING,
    ratingKey,
    skipKey,
    watchlistKey,
} from '@/lib/userData';
import { setValue, useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
import { markTipSeen, type Tip, useTip } from '@/lib/tips';
import mineCss from '../mine/mine.module.css';
import css from './swipe.module.css';

type DeckType = SearchEntry['type'] | 'all';

const typeChoice = storedChoice<DeckType>(
    'season-o-meter:swipe-type',
    ['all', 'series', 'movies'],
    'all'
);

const TYPE_OPTIONS = [
    { value: 'all', label: 'Both' },
    { value: 'series', label: 'TV series' },
    { value: 'movies', label: 'Film series' },
] as const;

const RATINGS = Array.from(
    { length: MAX_RATING - MIN_RATING + 1 },
    (_, i) => MIN_RATING + i
);

/** A new order on every visit, kept while moving around the site. */
const SEED = Math.random();

/** How far a card is dragged before letting go of it skips or saves it. */
const SWIPE_DISTANCE = 110;
/** A flick this fast, in px/ms, counts from a shorter distance. */
const FLICK_SPEED = 0.6;
const FLICK_DISTANCE = 40;
/** Movement before a press counts as a drag rather than a tap. */
const DRAG_SLOP = 6;

/**
 * Where the up and down arrows start on the scale. Most of what's been seen
 * is rated somewhere in between, so either is a few presses away.
 */
const UP_START = 5;
const DOWN_START = MAX_RATING;

/** Whether shortcuts use ⌘ rather than Ctrl, as on a Mac. */
const useCommandKey = () =>
    useSyncExternalStore(
        () => () => {},
        () => /Mac|iPhone|iPad/.test(navigator.platform),
        () => false
    );

/** How wide a card is, for picking a poster size. */
const POSTER_SIZES = '(max-width: 420px) 80vw, 360px';

type Direction = 'left' | 'right' | 'up';

type Leaving = { entry: SearchEntry; direction: Direction; from: number };

/** Something done to a card, which undo clears again. */
type Action = { key: string; message: string };

export function Swipe() {
    const data = useUserData();
    const { index, failed } = useSearchIndex();
    const type = typeChoice.useChoice();
    const order = useMemo(() => index && deckOrder(index, SEED), [index]);
    const deck = useMemo(
        () => (order && data ? remaining(order, data, type) : null),
        [order, data, type]
    );

    return (
        <div className={css.swipe}>
            <h1 className="visually-hidden">Swipe</h1>
            <div className={css.filter}>
                <ChoicePicker
                    label={<span className="visually-hidden">Show</span>}
                    options={TYPE_OPTIONS}
                    current={typeChoice.useStoredChoice()}
                    onChange={typeChoice.set}
                />
            </div>

            {failed ? (
                <p className={mineCss.status}>Could not load the series.</p>
            ) : !deck ? (
                <p className={mineCss.status}>Loading…</p>
            ) : (
                <Deck deck={deck} />
            )}
        </div>
    );
}

function Deck({ deck }: { deck: SearchEntry[] }) {
    const [leaving, setLeaving] = useState<Leaving | null>(null);
    const [history, setHistory] = useState<Action[]>([]);
    /** A rating picked with the up and down arrows, for Enter to save. */
    const [picking, setPicking] = useState<{
        id: string;
        rating: number;
    } | null>(null);
    const scaleLabel = useId();
    const commandKey = useCommandKey();
    const undoTip = useTip('swipe-undo-key');

    const cards = deck
        .filter((entry) => entry.id !== leaving?.entry.id)
        .slice(0, 3);
    const top = cards.at(0);
    const last = history.at(-1);
    // Only for the card it was picked on.
    const picked = picking && picking.id === top?.id ? picking.rating : null;

    const act = (
        entry: SearchEntry,
        key: string,
        value: number,
        direction: Direction,
        from: number,
        message: string
    ) => {
        setValue(key, value);
        setLeaving({ entry, direction, from });
        setHistory((actions) => [...actions.slice(-19), { key, message }]);
    };

    const skip = (from = 0) => {
        if (top) {
            act(top, skipKey(top.id), 1, 'left', from, `Skipped ${top.title}.`);
        }
    };

    const save = (from = 0) => {
        if (top) {
            act(
                top,
                watchlistKey(top.id),
                1,
                'right',
                from,
                `Added ${top.title} to your watchlist.`
            );
        }
    };

    /** Like a dating app: left is no, right is yes. */
    const swipe = (direction: 'left' | 'right', from = 0) =>
        direction === 'left' ? skip(from) : save(from);

    const rate = (rating: number) => {
        if (top) {
            act(
                top,
                ratingKey(top.id),
                rating,
                'up',
                0,
                `Rated ${top.title} ${rating}.`
            );
        }
    };

    /** Moves the picked rating up or down the scale, or starts picking. */
    const pick = (step: 1 | -1) => {
        if (!top) return;
        const rating =
            picked === null
                ? step > 0
                    ? UP_START
                    : DOWN_START
                : Math.min(MAX_RATING, Math.max(MIN_RATING, picked + step));
        setPicking({ id: top.id, rating });
    };

    const undo = () => {
        if (!last) return;
        setValue(last.key, null);
        setHistory((actions) => actions.slice(0, -1));
        setLeaving(null);
    };

    const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (
            event.target instanceof Element &&
            event.target.closest('input, textarea, select, [contenteditable]')
        ) {
            return;
        }
        // ⌘Z or Ctrl+Z, but not with Shift, which is redo.
        if (
            event.key.toLowerCase() === 'z' &&
            (event.metaKey || event.ctrlKey) &&
            !event.altKey &&
            !event.shiftKey
        ) {
            if (last) {
                undo();
                markTipSeen('swipe-undo-key');
                event.preventDefault();
            }
            return;
        }
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft') {
            skip();
            markTipSeen('swipe-skip-key');
        } else if (event.key === 'ArrowRight') {
            save();
            markTipSeen('swipe-save-key');
        } else if (event.key === 'ArrowUp') {
            pick(1);
        } else if (event.key === 'ArrowDown') {
            pick(-1);
        } else if (event.key === 'Enter' && picked !== null) {
            rate(picked);
        } else if (event.key === 'Escape' && picked !== null) {
            setPicking(null);
        } else if (/^\d$/.test(event.key)) {
            // 0 is 10, the key after 9.
            rate(Number(event.key) || MAX_RATING);
        } else {
            return;
        }
        event.preventDefault();
    });

    useEffect(() => {
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Stable keys, so a card keeps its element, and poster, as it moves up
    // the stack and leaves.
    const stack = [
        ...(leaving
            ? [{ entry: leaving.entry, place: leaving.direction }]
            : []),
        ...cards.map((entry, i) => ({
            entry,
            place: (['top', 'next', 'third'] as const)[i],
        })),
    ];

    return (
        <>
            <div className={css.stack}>
                <KeyTip
                    tip="swipe-skip-key"
                    direction="left"
                    label="Skip"
                    disabled={!top}
                    onClick={() => skip()}
                />
                <KeyTip
                    tip="swipe-save-key"
                    direction="right"
                    label="Watchlist"
                    disabled={!top}
                    onClick={() => save()}
                />
                {stack.map(({ entry, place }) => (
                    <Card
                        key={entry.id}
                        entry={entry}
                        place={place}
                        from={place === leaving?.direction ? leaving.from : 0}
                        onSwipe={swipe}
                        onLeft={() => setLeaving(null)}
                    />
                ))}
                {!top && (
                    <div className={css.empty}>
                        <p>
                            <strong>That’s everything.</strong> You’ve rated,
                            skipped or added every one of them to your
                            watchlist.
                        </p>
                        <p>
                            Skipped ones can be brought back on your{' '}
                            <Link href="/profile/">Profile</Link>.
                        </p>
                    </div>
                )}
            </div>

            <div className={css.controls}>
                <div
                    className={css.rate}
                    role="group"
                    aria-labelledby={scaleLabel}
                >
                    <span id={scaleLabel} className={css.rateLabel}>
                        Seen it? Rate it
                    </span>
                    <span className={css.scale}>
                        {RATINGS.map((rating) => (
                            <button
                                key={rating}
                                type="button"
                                className={css.step}
                                aria-label={`${rating} of ${MAX_RATING}`}
                                data-picked={rating === picked ? '' : undefined}
                                disabled={!top}
                                onClick={() => rate(rating)}
                            >
                                {rating}
                            </button>
                        ))}
                    </span>
                </div>

                <button
                    type="button"
                    className={css.skip}
                    disabled={!top}
                    onClick={() => skip()}
                >
                    Skip
                </button>

                <div className={css.feedback}>
                    <p aria-live="polite">
                        {picked !== null && top
                            ? `Rate ${top.title} ${picked}? Press Enter.`
                            : last?.message}
                    </p>
                    {last && picked === null && (
                        <span className={css.undoGroup}>
                            <button
                                type="button"
                                className={css.undo}
                                aria-keyshortcuts={
                                    commandKey ? 'Meta+Z' : 'Control+Z'
                                }
                                onClick={undo}
                            >
                                Undo
                            </button>
                            {undoTip && (
                                // The key itself is told with aria-keyshortcuts.
                                <kbd className={css.undoKey} aria-hidden>
                                    {commandKey ? '⌘Z' : 'Ctrl+Z'}
                                </kbd>
                            )}
                        </span>
                    )}
                </div>

                <p className={css.hint}>
                    <span className={css.touchHint}>
                        Swipe left to skip, right to add to your watchlist.
                    </span>
                    <span className={css.keyHint}>
                        Drag left or press ← to skip, drag right or press → to
                        add to your watchlist, press 1–9 and 0 to rate, or pick
                        a rating with ↑ and ↓ and press Enter.
                    </span>{' '}
                    Skipped ones can be brought back on your{' '}
                    <Link href="/profile/">Profile</Link>.
                </p>
                <p className={css.hint}>
                    {deck.length.toLocaleString('en')} to go
                </p>
            </div>
        </>
    );
}

/**
 * A button beside the cards, on devices with a mouse and keyboard, that shows
 * which arrow key does the same. It goes away once the key has been used.
 */
function KeyTip({
    tip,
    direction,
    label,
    disabled,
    onClick,
}: {
    tip: Tip;
    direction: 'left' | 'right';
    label: string;
    disabled: boolean;
    onClick: () => void;
}) {
    const shown = useTip(tip);
    // Not until it's known, so it doesn't flash before going away.
    if (shown === null) return null;
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';

    return (
        <button
            type="button"
            className={css.keyTip}
            data-direction={direction}
            data-seen={shown ? undefined : ''}
            aria-keyshortcuts={key}
            // Still there while it fades out, but no longer in use.
            inert={!shown}
            disabled={disabled}
            onClick={onClick}
        >
            {/* The key itself is told with aria-keyshortcuts. */}
            <span className={css.keyTipHint} aria-hidden>
                Try the keyboard
            </span>
            <kbd aria-hidden>{direction === 'left' ? '←' : '→'}</kbd>
            <span>{label}</span>
        </button>
    );
}

type Place = 'top' | 'next' | 'third' | Direction;

function Card({
    entry,
    place,
    from,
    onSwipe,
    onLeft,
}: {
    entry: SearchEntry;
    place: Place;
    /** How far it was dragged when it was let go, for leaving from there. */
    from: number;
    onSwipe: (direction: 'left' | 'right', from: number) => void;
    onLeft: () => void;
}) {
    const [dx, setDx] = useState(0);
    const [dragging, setDragging] = useState(false);
    const drag = useRef<{
        pointerId: number;
        startX: number;
        lastX: number;
        lastTime: number;
        speed: number;
        moved: boolean;
    } | null>(null);
    /** Set after a drag, so letting go over the title doesn't follow it. */
    const dragged = useRef(false);
    const isTop = place === 'top';

    const onPointerDown = (event: PointerEvent<HTMLElement>) => {
        if (!isTop || (event.pointerType === 'mouse' && event.button !== 0)) {
            return;
        }
        dragged.current = false;
        drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            lastX: event.clientX,
            lastTime: event.timeStamp,
            speed: 0,
            moved: false,
        };
    };

    const onPointerMove = (event: PointerEvent<HTMLElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const x = event.clientX - current.startX;
        if (!current.moved) {
            if (Math.abs(x) < DRAG_SLOP) return;
            current.moved = true;
            // Only now, so a tap on the title still reaches the link.
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
        }
        const elapsed = event.timeStamp - current.lastTime;
        if (elapsed > 0) {
            const speed = (event.clientX - current.lastX) / elapsed;
            current.speed = current.speed * 0.5 + speed * 0.5;
        }
        current.lastX = event.clientX;
        current.lastTime = event.timeStamp;
        setDx(x);
    };

    const onPointerUp = (event: PointerEvent<HTMLElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        drag.current = null;
        if (!current.moved) return;
        dragged.current = true;
        setDragging(false);
        setDx(0);
        const flicked =
            Math.abs(dx) > FLICK_DISTANCE &&
            Math.abs(current.speed) > FLICK_SPEED &&
            Math.sign(current.speed) === Math.sign(dx);
        if (Math.abs(dx) > SWIPE_DISTANCE || flicked) {
            onSwipe(dx < 0 ? 'left' : 'right', dx);
        }
    };

    const onPointerCancel = () => {
        drag.current = null;
        setDragging(false);
        setDx(0);
    };

    const leaving = place === 'left' || place === 'right' || place === 'up';
    const offset = leaving ? from : dx;
    const progress = Math.min(1, Math.abs(dx) / SWIPE_DISTANCE);

    return (
        <article
            className={css.card}
            data-place={place}
            data-dragging={dragging ? '' : undefined}
            style={
                {
                    '--dx': `${offset}px`,
                    '--tilt': `${offset / 20}deg`,
                    '--skip-progress': dx < 0 ? progress : 0,
                    '--save-progress': dx > 0 ? progress : 0,
                } as CSSProperties
            }
            inert={!isTop}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClickCapture={(event) => {
                if (dragged.current) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
            onAnimationEnd={(event) => {
                if (leaving && event.target === event.currentTarget) onLeft();
            }}
        >
            <SharedPoster id={entry.id}>
                <div className={css.poster}>
                    <Poster
                        entry={entry}
                        sizes={POSTER_SIZES}
                        eager={place !== 'third'}
                        untitled
                    />
                </div>
            </SharedPoster>
            <div className={css.caption}>
                <h2>
                    <Link href={entryHref(entry)}>{entry.title}</Link>
                </h2>
                <p>
                    {[formatYears(entry), partsLabel(entry)]
                        .filter(Boolean)
                        .join(' · ')}
                </p>
            </div>
            <span className={css.stamp} data-stamp="skip" aria-hidden>
                Skip
            </span>
            <span className={css.stamp} data-stamp="save" aria-hidden>
                Watchlist
            </span>
        </article>
    );
}
