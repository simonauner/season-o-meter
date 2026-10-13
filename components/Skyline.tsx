'use client';

import Link from 'next/link';
import { type CSSProperties, useSyncExternalStore } from 'react';
import { drawSkyline, type SkylineBuilding } from '@/lib/footer';
import css from './footer.module.css';

// Ratings from FLOOR up map onto the bar height, so the skyline has some drama.
const FLOOR = 5;
const barHeight = (rating: number) =>
    `${Math.max(12, Math.min(100, ((rating - FLOOR) / (10 - FLOOR)) * 100))}%`;

/** The seed for the pre-rendered page, before the browser draws its own. */
const SERVER_SEED = 1;

/** Drawn once per page load, so the skyline stays put while navigating. */
let seed: number | null = null;

const getSeed = () => (seed ??= Math.floor(Math.random() * 2 ** 32));

// The seed never changes, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

/** Series and film series drawn at random from the pool, one per building. */
export function Skyline({ pool }: { pool: SkylineBuilding[] }) {
    const buildings = drawSkyline(
        pool,
        useSyncExternalStore(subscribeNever, getSeed, () => SERVER_SEED)
    );

    return (
        <nav aria-label="Popular series and films" className={css.skyline}>
            {buildings.map(({ href, title, ratings }) => {
                const peak = ratings.indexOf(Math.max(...ratings));
                return (
                    <Link
                        key={href}
                        href={href}
                        className={css.building}
                        data-title={title}
                        aria-label={title}
                    >
                        {ratings.map((rating, i) => (
                            <span
                                key={i}
                                className={i === peak ? css.peak : css.bar}
                                style={
                                    {
                                        '--h': barHeight(rating),
                                        '--i': i,
                                    } as CSSProperties
                                }
                            />
                        ))}
                    </Link>
                );
            })}
        </nav>
    );
}
