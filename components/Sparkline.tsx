const WIDTH = 240;
const HEIGHT = 64;
const PAD = 6;
const MAX_RATING = 10;

/**
 * Small, static season-by-season rating line. Always drawn on a 0–10 scale so
 * that sparklines can be compared with each other.
 */
export function Sparkline({ ratings }: { ratings: number[] }) {
    if (ratings.length < 2) return null;

    const x = (i: number) =>
        PAD + (i * (WIDTH - PAD * 2)) / (ratings.length - 1);
    const y = (rating: number) =>
        PAD + ((MAX_RATING - rating) * (HEIGHT - PAD * 2)) / MAX_RATING;

    const points = ratings.map((r, i) => `${x(i)},${y(r)}`).join(' ');
    const last = ratings.length - 1;

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            aria-hidden="true"
            style={{ display: 'block', overflow: 'visible' }}
        >
            <polygon
                points={`${x(0)},${y(0)} ${points} ${x(last)},${y(0)}`}
                fill="var(--series)"
                opacity={0.1}
            />
            <polyline
                points={points}
                fill="none"
                stroke="var(--series)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <circle
                cx={x(last)}
                cy={y(ratings[last])}
                r={4}
                fill="var(--series)"
                stroke="var(--surface)"
                strokeWidth={2}
            />
        </svg>
    );
}
