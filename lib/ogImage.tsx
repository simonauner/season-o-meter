import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { formatRating } from './format';
import { OG_SIZE } from './openGraph';

const NAVY = '#0d1b2a';
const ACCENT = '#3987e5';
const WHITE = '#ffffff';
const MUTED = 'rgb(255 255 255 / 0.62)';
const BAR = 'rgb(255 255 255 / 0.28)';

const FONT_DIR = path.join(
    process.cwd(),
    'node_modules',
    'geist',
    'dist',
    'fonts',
    'geist-sans'
);

let fonts: Promise<{ regular: Buffer; bold: Buffer }> | undefined;

const loadFonts = () =>
    (fonts ??= Promise.all([
        readFile(path.join(FONT_DIR, 'Geist-Regular.ttf')),
        readFile(path.join(FONT_DIR, 'Geist-Bold.ttf')),
    ]).then(([regular, bold]) => ({ regular, bold })));

async function render(element: React.ReactElement) {
    const { regular, bold } = await loadFonts();
    return new ImageResponse(element, {
        ...OG_SIZE,
        fonts: [
            { name: 'Geist', data: regular, weight: 400, style: 'normal' },
            { name: 'Geist', data: bold, weight: 700, style: 'normal' },
        ],
    });
}

/** The header's logo mark, as in app/icon.svg. */
function LogoMark({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="-3 -3 30 30">
            <rect
                x="-2.5"
                y="-2.5"
                width="29"
                height="29"
                rx="7.5"
                fill="#ffffff"
                fillOpacity="0.08"
                stroke="#ffffff"
                strokeOpacity="0.12"
            />
            <g fill="#ffffff" fillOpacity="0.45">
                <rect x="1" y="12" width="3.2" height="9" rx="1.2" />
                <rect x="5.6" y="8" width="3.2" height="13" rx="1.2" />
                <rect x="14.8" y="9" width="3.2" height="12" rx="1.2" />
                <rect x="19.4" y="14" width="3.2" height="7" rx="1.2" />
            </g>
            <rect
                x="10.2"
                y="3"
                width="3.2"
                height="18"
                rx="1.2"
                fill={ACCENT}
            />
        </svg>
    );
}

function Brand({ size = 34 }: { size?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <LogoMark size={size * 1.4} />
            <span style={{ fontSize: size, fontWeight: 700, color: WHITE }}>
                Season-o-meter
            </span>
        </div>
    );
}

export type OgBar = {
    rating: number;
    /** Short label under the bar, like "S3" or "1980". */
    label: string;
};

/** Labels on every bar while they fit, else only on a few. */
const MAX_LABELLED_BARS = 16;

/** Fills the space it's given, with each bar's height its share of it. */
function Bars({ bars }: { bars: OgBar[] }) {
    const ratings = bars.map((bar) => bar.rating);
    const peak = ratings.indexOf(Math.max(...ratings));
    // Hug the data a little, so the ups and downs are visible.
    const floor = Math.max(0, Math.floor(Math.min(...ratings)) - 1);
    const ceiling = Math.min(10, Math.ceil(Math.max(...ratings)));
    // At most 85% high, leaving room for the rating above the bar.
    const barHeight = (rating: number) =>
        `${Math.max(5, ((rating - floor) / (ceiling - floor)) * 85)}%`;
    const last = bars.length - 1;
    // With many bars, label the first, the best and the last, leaving out
    // an end that's so close to the best that their labels would overlap.
    const nearPeak = (i: number) => i !== peak && Math.abs(i - peak) < 3;
    const labelled = (i: number) =>
        bars.length <= MAX_LABELLED_BARS ||
        i === peak ||
        ((i === 0 || i === last) && !nearPeak(i));
    const gap = bars.length > 24 ? 4 : bars.length > 12 ? 8 : 14;

    return (
        <div style={{ display: 'flex', flex: 1, gap, marginTop: 24 }}>
            {bars.map((bar, i) => (
                <div
                    key={i}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        minWidth: 0,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            flex: 1,
                            width: '100%',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 22,
                                fontWeight: 700,
                                color: i === peak ? WHITE : MUTED,
                                marginBottom: 8,
                                opacity: labelled(i) ? 1 : 0,
                            }}
                        >
                            {formatRating(bar.rating)}
                        </span>
                        <div
                            style={{
                                width: '100%',
                                height: barHeight(bar.rating),
                                borderRadius: 6,
                                background: i === peak ? ACCENT : BAR,
                            }}
                        />
                    </div>
                    <span
                        style={{
                            fontSize: 20,
                            color: MUTED,
                            marginTop: 8,
                            opacity: labelled(i) ? 1 : 0,
                        }}
                    >
                        {bar.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

/** One rating, big, for a series with nothing to compare it with. */
function BigRating({ rating, label }: { rating: number; label: string }) {
    return (
        <div
            style={{
                display: 'flex',
                flex: 1,
                alignItems: 'flex-end',
                gap: 20,
            }}
        >
            <span
                style={{
                    fontSize: 168,
                    fontWeight: 700,
                    lineHeight: 0.85,
                    letterSpacing: '-0.03em',
                    color: ACCENT,
                }}
            >
                {formatRating(rating)}
            </span>
            <span style={{ fontSize: 34, color: MUTED }}>{label}</span>
        </div>
    );
}

/** Shrinks long titles so they still fit on two lines. */
const titleSize = (title: string) =>
    title.length > 40 ? 52 : title.length > 24 ? 62 : 76;

/**
 * A link preview for a series or film series: its verdict and ratings, or
 * its one rating when there's only one.
 */
export function titleImage({
    title,
    meta,
    verdict,
    bars,
    single,
}: {
    title: string;
    /** Shown under the title, like ["TV series", "2008–2013", "5 seasons"]. */
    meta: string[];
    verdict?: string;
    bars: OgBar[];
    single?: { rating: number; label: string };
}) {
    return render(
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                padding: '48px 64px 40px',
                background: NAVY,
                color: WHITE,
                fontFamily: 'Geist',
            }}
        >
            <Brand size={28} />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginTop: 28,
                }}
            >
                <span
                    style={{
                        fontSize: titleSize(title),
                        fontWeight: 700,
                        lineHeight: 1.05,
                        letterSpacing: '-0.02em',
                        lineClamp: 2,
                    }}
                >
                    {title}
                </span>
                <span style={{ fontSize: 28, color: MUTED, marginTop: 12 }}>
                    {meta.filter(Boolean).join(' · ')}
                </span>
                {verdict && (
                    <span
                        style={{
                            fontSize: 34,
                            fontWeight: 700,
                            color: ACCENT,
                            marginTop: 10,
                            lineClamp: 1,
                        }}
                    >
                        {verdict}
                    </span>
                )}
            </div>
            {single ? <BigRating {...single} /> : <Bars bars={bars} />}
        </div>
    );
}

/** A made-up run of seasons for the site's own preview, peaking in the middle. */
const SITE_BARS = [7.6, 8.1, 8.6, 9.3, 8.8, 8.2, 7.4, 6.9];

/** The site's own link preview, for pages without one of their own. */
export function siteImage() {
    const peak = SITE_BARS.indexOf(Math.max(...SITE_BARS));
    return render(
        <div
            style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                padding: '72px 80px',
                background: NAVY,
                color: WHITE,
                fontFamily: 'Geist',
                alignItems: 'center',
                gap: 64,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                }}
            >
                <Brand size={48} />
                <span
                    style={{
                        fontSize: 40,
                        lineHeight: 1.3,
                        marginTop: 40,
                        color: WHITE,
                    }}
                >
                    How TV series are rated season by season, and film series
                    movie by movie.
                </span>
                <span style={{ fontSize: 30, color: ACCENT, marginTop: 28 }}>
                    Where they peaked and where they went downhill.
                </span>
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 14,
                    height: 380,
                    width: 360,
                }}
            >
                {SITE_BARS.map((rating, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: `${((rating - 6) / 4) * 100}%`,
                            borderRadius: 8,
                            background: i === peak ? ACCENT : BAR,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
