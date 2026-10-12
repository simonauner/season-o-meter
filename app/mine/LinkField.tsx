'use client';

import { useState } from 'react';
import css from './mine.module.css';

/** A link to copy, or to share with the system share sheet where there is one. */
export function LinkField({
    link,
    label,
    shareTitle,
}: {
    link: string | null;
    label: string;
    shareTitle: string;
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
                className={css.button}
                onClick={copy}
                disabled={!link}
            >
                {link !== null && copiedLink === link ? 'Copied' : 'Copy link'}
            </button>
            {link && 'share' in navigator && (
                <button
                    type="button"
                    className={css.button}
                    onClick={() =>
                        navigator
                            .share({ title: shareTitle, url: link })
                            .catch(() => {})
                    }
                >
                    Share…
                </button>
            )}
        </div>
    );
}
