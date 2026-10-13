'use client';

import { type CSSProperties, useState } from 'react';
import { formatYears } from '@/lib/format';
import type { SearchEntry } from '@/lib/searchIndex';
import css from './poster.module.css';

const TMDB_IMAGES = 'https://image.tmdb.org/t/p';
const WIDTHS = [185, 342, 500, 780];

/** The most bars a drawn poster has room for. */
const MAX_BARS = 12;
/** Ratings from FLOOR up map onto the bar height, like the footer skyline. */
const FLOOR = 5;

/** What a poster is drawn from. */
export type PosterEntry = Pick<
    SearchEntry,
    'type' | 'id' | 'title' | 'startYear' | 'endYear' | 'ratings' | 'poster'
>;

/**
 * The image last shown for each poster, which the browser has at hand. A
 * bigger copy of the same poster shows it until its own image has loaded,
 * so it never starts out empty, as when a small poster in a list grows into
 * the one on the page it opens.
 */
const shown = new Map<string, string>();

/** A hue for a title, the same every time, so its drawn poster is too. */
const hueOf = (id: string) =>
    [...id].reduce((hue, char) => (hue * 31 + char.charCodeAt(0)) % 360, 7);

/**
 * A title's poster from TMDB, or one drawn from its title and ratings when
 * TMDB has none or the image doesn't load.
 */
export function Poster({
    entry,
    sizes,
    eager = false,
    untitled = false,
}: {
    entry: PosterEntry;
    /** How wide the poster is shown, for picking an image size. */
    sizes: string;
    eager?: boolean;
    /** Leaves the title off a drawn poster, for when it's shown next to it. */
    untitled?: boolean;
}) {
    const [failed, setFailed] = useState<string | null>(null);

    if (entry.poster && failed !== entry.poster) {
        const path = entry.poster;
        const placeholder = shown.get(path);
        return (
            // A static export has no image optimizer; TMDB serves the sizes.
            // eslint-disable-next-line @next/next/no-img-element
            <img
                className={css.poster}
                style={
                    placeholder
                        ? { backgroundImage: `url(${placeholder})` }
                        : undefined
                }
                src={`${TMDB_IMAGES}/w342${path}`}
                srcSet={WIDTHS.map(
                    (width) => `${TMDB_IMAGES}/w${width}${path} ${width}w`
                ).join(', ')}
                sizes={sizes}
                alt=""
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                onLoad={(event) =>
                    shown.set(path, event.currentTarget.currentSrc)
                }
                onError={() => setFailed(path)}
            />
        );
    }

    return <DrawnPoster entry={entry} untitled={untitled} />;
}

function DrawnPoster({
    entry,
    untitled,
}: {
    entry: PosterEntry;
    untitled: boolean;
}) {
    const ratings = entry.ratings.slice(0, MAX_BARS);
    const peak = ratings.indexOf(Math.max(...ratings));

    return (
        <div
            className={css.drawn}
            style={{ '--hue': hueOf(entry.id) } as CSSProperties}
            data-untitled={untitled ? '' : undefined}
            aria-hidden
        >
            <span className={css.kind}>
                {entry.type === 'movies' ? 'Film series' : 'TV series'}
            </span>
            {!untitled && (
                <>
                    <span className={css.title}>{entry.title}</span>
                    <span className={css.years}>{formatYears(entry)}</span>
                </>
            )}
            <span className={css.bars}>
                {ratings.map((rating, i) => (
                    <span
                        key={i}
                        className={i === peak ? css.peak : css.bar}
                        style={{
                            height: `${Math.max(8, Math.min(100, ((rating - FLOOR) / (10 - FLOOR)) * 100))}%`,
                        }}
                    />
                ))}
            </span>
        </div>
    );
}
