const WIDTH = 240;
const HEIGHT = 56;
const PAD = 6;
// Ratings that map to the bottom and top of the chart when placing a series.
const LOW = 6;
const HIGH = 10;

/** Small, static season-by-season rating line. */
export function Sparkline({ ratings }: { ratings: number[] }) {
    if (ratings.length < 2) return null;

    const lowest = Math.min(...ratings);
    const highest = Math.max(...ratings);
    // Keep flat-ish shows looking flat instead of exaggerating tiny wobbles.
    const span = Math.max(highest - lowest, 1);
    // Zoomed in as above, but slide the window so the line sits as high in the
    // chart as the series rates: a show around 9 runs near the top, one
    // around 7 near the bottom.
    const middle = (lowest + highest) / 2;
    const level = Math.min(Math.max((middle - LOW) / (HIGH - LOW), 0), 1);
    const min = Math.min(
        Math.max(middle - level * span, highest - span),
        lowest
    );
    const max = min + span;

    const x = (i: number) =>
        PAD + (i * (WIDTH - PAD * 2)) / (ratings.length - 1);
    const y = (rating: number) =>
        PAD + ((max - rating) * (HEIGHT - PAD * 2)) / (max - min);

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
                points={`${x(0)},${HEIGHT} ${points} ${x(last)},${HEIGHT}`}
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
