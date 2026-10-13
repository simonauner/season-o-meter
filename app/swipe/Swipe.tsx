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
} from 'react';
import { ChoicePicker } from '@/components/ChoicePicker';
import { Poster } from '@/components/Poster';
import { formatYears } from '@/lib/format';
import type { SearchEntry } from '@/lib/searchIndex';
import { storedChoice } from '@/lib/storedChoice';
import { deckOrder, entryHref, partsLabel, remaining } from '@/lib/swipeDeck';
import { MAX_RATING, MIN_RATING, ratingKey, skipKey } from '@/lib/userData';
import { setValue, useUserData } from '@/lib/userStore';
import { useSearchIndex } from '@/lib/useSearchIndex';
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

/** How far a card is dragged before letting go of it skips it. */
const SWIPE_DISTANCE = 110;
/** A flick this fast, in px/ms, skips from a shorter distance. */
const FLICK_SPEED = 0.6;
const FLICK_DISTANCE = 40;
/** Movement before a press counts as a drag rather than a tap. */
const DRAG_SLOP = 6;

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
    const scaleLabel = useId();

    const cards = deck
        .filter((entry) => entry.id !== leaving?.entry.id)
        .slice(0, 3);
    const top = cards.at(0);
    const last = history.at(-1);

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

    const skip = (direction: Direction, from = 0) => {
        if (top) {
            act(
                top,
                skipKey(top.id),
                1,
                direction,
                from,
                `Skipped ${top.title}.`
            );
        }
    };

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

    const undo = () => {
        if (!last) return;
        setValue(last.key, null);
        setHistory((actions) => actions.slice(0, -1));
        setLeaving(null);
    };

    const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (
            event.target instanceof Element &&
            event.target.closest('input, textarea, select, [contenteditable]')
        ) {
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            skip(event.key === 'ArrowLeft' ? 'left' : 'right');
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
                {stack.map(({ entry, place }) => (
                    <Card
                        key={entry.id}
                        entry={entry}
                        place={place}
                        from={place === leaving?.direction ? leaving.from : 0}
                        onSkip={skip}
                        onLeft={() => setLeaving(null)}
                    />
                ))}
                {!top && (
                    <div className={css.empty}>
                        <p>
                            <strong>That’s everything.</strong> You’ve rated,
                            skipped or saved every one of them.
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
                    onClick={() => skip('left')}
                >
                    Skip
                </button>

                <div className={css.feedback}>
                    <p aria-live="polite">{last?.message}</p>
                    {last && (
                        <button
                            type="button"
                            className={css.undo}
                            onClick={undo}
                        >
                            Undo
                        </button>
                    )}
                </div>

                <p className={css.hint}>
                    {deck.length.toLocaleString('en')} to go
                    <span className={css.touchHint}>
                        {' '}
                        · Swipe the card away to skip
                    </span>
                    <span className={css.keyHint}>
                        {' '}
                        · Drag the card or press ← → to skip, 1–9 and 0 to rate
                    </span>
                </p>
            </div>
        </>
    );
}

type Place = 'top' | 'next' | 'third' | Direction;

function Card({
    entry,
    place,
    from,
    onSkip,
    onLeft,
}: {
    entry: SearchEntry;
    place: Place;
    /** How far it was dragged when it was let go, for leaving from there. */
    from: number;
    onSkip: (direction: Direction, from: number) => void;
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
            onSkip(dx < 0 ? 'left' : 'right', dx);
        }
    };

    const onPointerCancel = () => {
        drag.current = null;
        setDragging(false);
        setDx(0);
    };

    const leaving = place === 'left' || place === 'right' || place === 'up';
    const offset = leaving ? from : dx;

    return (
        <article
            className={css.card}
            data-place={place}
            data-dragging={dragging ? '' : undefined}
            style={
                {
                    '--dx': `${offset}px`,
                    '--tilt': `${offset / 20}deg`,
                    '--progress': Math.min(1, Math.abs(dx) / SWIPE_DISTANCE),
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
            <div className={css.poster}>
                <Poster
                    entry={entry}
                    sizes={POSTER_SIZES}
                    eager={place !== 'third'}
                    untitled
                />
            </div>
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
            <span className={css.stamp} aria-hidden>
                Skip
            </span>
        </article>
    );
}
