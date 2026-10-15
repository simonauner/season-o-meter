'use client';

import { useMemo } from 'react';
import { encode } from 'uqr';
import css from '../mine/mine.module.css';

/** A QR code for a link, black on white in either theme so cameras read it. */
export function QrCode({ value, label }: { value: string; label: string }) {
    const { size, path } = useMemo(() => {
        // A four-module quiet zone, as the standard asks for.
        const { size, data } = encode(value, { ecc: 'M', border: 4 });
        const path = data
            .flatMap((row, y) =>
                row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ''))
            )
            .join('');
        return { size, path };
    }, [value]);

    return (
        <svg
            className={css.qr}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-label={label}
            shapeRendering="crispEdges"
        >
            <rect width={size} height={size} fill="#ffffff" />
            <path d={path} fill="#000000" />
        </svg>
    );
}
