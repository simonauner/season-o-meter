'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Done } from '@/components/Done';
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
    /** Each copy gleams again. */
    const [copies, setCopies] = useState(0);

    const copy = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedLink(link);
            setCopies((n) => n + 1);
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
        <>
            <input
                className={`${css.link} ${css.overButtons}`}
                readOnly
                value={link ?? ''}
                aria-label={label}
                onFocus={(event) => event.target.select()}
            />
            {/* Copy link last, so "Copied" comes right after it. */}
            <div className={css.buttons}>
                {link && 'share' in navigator && (
                    <Button onClick={share}>Share…</Button>
                )}
                <Button
                    variant="tonal"
                    className={flash ? css.flash : undefined}
                    onClick={copy}
                    disabled={!link}
                    onAnimationEnd={onFlashed}
                >
                    Copy link
                </Button>
                {link !== null && copiedLink === link && (
                    <Done key={copies}>Copied</Done>
                )}
            </div>
        </>
    );
}
