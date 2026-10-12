'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Fact } from '@/lib/footer';
import css from './footer.module.css';

const randomOther = (count: number, current: number) =>
    count < 2
        ? 0
        : (current + 1 + Math.floor(Math.random() * (count - 1))) % count;

/** A hidden bit of trivia for visitors who sit through the credits. */
export function PostCredits({ facts }: { facts: Fact[] }) {
    const [index, setIndex] = useState(0);
    if (facts.length === 0) return null;

    const fact = facts[index];

    return (
        <details
            className={css.postCredits}
            onToggle={(event) => {
                if (event.currentTarget.open) {
                    setIndex((i) => randomOther(facts.length, i));
                }
            }}
        >
            <summary>Stick around for the post-credits scene</summary>
            <div className={css.scene} aria-live="polite">
                <p>
                    <span className={css.sceneLead}>{fact.lead}:</span>{' '}
                    <Link href={fact.href}>{fact.title}</Link>, {fact.detail}.
                </p>
                {facts.length > 1 && (
                    <button
                        type="button"
                        className={css.encore}
                        onClick={() =>
                            setIndex((i) => randomOther(facts.length, i))
                        }
                    >
                        Another scene
                    </button>
                )}
            </div>
        </details>
    );
}
