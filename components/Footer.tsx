import Link from 'next/link';
import type { CSSProperties } from 'react';
import { getData } from '@/lib/data';
import { postCreditsFacts, skylineShows, type SkylineShow } from '@/lib/footer';
import { PostCredits } from './PostCredits';
import css from './footer.module.css';

// Ratings from FLOOR up map onto the bar height, so the skyline has some drama.
const FLOOR = 5;
const barHeight = (rating: number) =>
    `${Math.max(12, Math.min(100, ((rating - FLOOR) / (10 - FLOOR)) * 100))}%`;

function Skyline({ shows }: { shows: SkylineShow[] }) {
    return (
        <nav aria-label="Popular series" className={css.skyline}>
            {shows.map(({ href, title, ratings }) => {
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

export function Footer() {
    const data = getData();
    const updated = new Date(data.generatedAt).toLocaleDateString('en', {
        dateStyle: 'long',
        timeZone: 'UTC',
    });

    return (
        <footer className={css.footer}>
            <Skyline shows={skylineShows(data)} />
            <div className={css.body}>
                <p className={css.wrap}>That&apos;s a wrap</p>
                <dl className={css.credits}>
                    <div>
                        <dt>Ratings</dt>
                        <dd>
                            <a href="https://www.imdb.com/" rel="noreferrer">
                                IMDb
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt>Film series</dt>
                        <dd>
                            <a
                                href="https://www.wikidata.org/"
                                rel="noreferrer"
                            >
                                Wikidata
                            </a>
                        </dd>
                    </div>
                    <div>
                        <dt>Season rating</dt>
                        <dd>The average of its episode ratings</dd>
                    </div>
                    <div>
                        <dt>Cutting room floor</dt>
                        <dd>Episodes with fewer than five votes</dd>
                    </div>
                    <div>
                        <dt>Last updated</dt>
                        <dd>{updated}</dd>
                    </div>
                </dl>
                <PostCredits facts={postCreditsFacts(data)} />
                <p className={css.fine}>
                    Information courtesy of{' '}
                    <a href="https://www.imdb.com/" rel="noreferrer">
                        IMDb
                    </a>
                    . Used with permission. No episodes were harmed in the
                    making of this site.
                </p>
            </div>
        </footer>
    );
}
