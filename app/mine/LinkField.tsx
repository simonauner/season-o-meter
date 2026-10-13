'use client';

import { useState } from 'react';
import css from './mine.module.css';

/** A link to copy, or to share with the system share sheet where there is one. */
export function LinkField({
    link,
    label,
    shareTitle,
    flash,
    onFlashed,
}: {
    link: string | null;
    label: string;
    shareTitle: string;
    /** Draws the eye to the copy button with a few blinks. */
    flash?: boolean;
    onFlashed?: () => void;
}) {
    const [copiedLink, setCopiedLink] = useState<string | null>(null);

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedLink(link);
        } catch {
            // The link is still there to copy by hand.
        }
    };

    const share = async () => {
        if (!link) return;
        try {
            await navigator.share({ title: shareTitle, url: link });
        } catch (error) {
            // Closing the share sheet is no reason to do anything else. Some
            // browsers never settle a share whose sheet was dismissed and then
            // turn down every later one, so copy the link instead.
            if (!(
                error instanceof DOMException && error.name === 'AbortError'
            )) {
                await copy();
            }
        }
    };

    return (
        <div className={css.linkRow}>
            <input
                className={css.link}
                readOnly
                value={link ?? ''}
                aria-label={label}
                onFocus={(event) => event.target.select()}
            />
            <button
                type="button"
                className={flash ? `${css.button} ${css.flash}` : css.button}
                onClick={copy}
                disabled={!link}
                onAnimationEnd={onFlashed}
            >
                {link !== null && copiedLink === link ? 'Copied' : 'Copy link'}
            </button>
            {link && 'share' in navigator && (
                <button type="button" className={css.button} onClick={share}>
                    Share…
                </button>
            )}
        </div>
    );
}
