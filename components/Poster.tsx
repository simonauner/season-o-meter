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
    entry: SearchEntry;
    /** How wide the poster is shown, for picking an image size. */
    sizes: string;
    eager?: boolean;
    /** Leaves the title off a drawn poster, for when it's shown next to it. */
    untitled?: boolean;
}) {
    const [failed, setFailed] = useState<string | null>(null);

    if (entry.poster && failed !== entry.poster) {
        const path = entry.poster;
        return (
            // A static export has no image optimizer; TMDB serves the sizes.
            // eslint-disable-next-line @next/next/no-img-element
            <img
                className={css.poster}
                src={`${TMDB_IMAGES}/w342${path}`}
                srcSet={WIDTHS.map(
                    (width) => `${TMDB_IMAGES}/w${width}${path} ${width}w`
                ).join(', ')}
                sizes={sizes}
                alt=""
                loading={eager ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
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
    entry: SearchEntry;
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
