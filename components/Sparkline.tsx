const WIDTH = 240;
const HEIGHT = 56;
const PAD = 6;

/** Small, static season-by-season rating line. */
export function Sparkline({ ratings }: { ratings: number[] }) {
    if (ratings.length < 2) return null;

    const lowest = Math.min(...ratings);
    const highest = Math.max(...ratings);
    const min = lowest;
    // Keep flat-ish shows looking flat instead of exaggerating tiny wobbles.
    const max = Math.max(highest, min + 1);

    const x = (i: number) =>
        PAD + (i * (WIDTH - PAD * 2)) / (ratings.length - 1);
    const y = (rating: number) =>
        PAD + ((max - rating) * (HEIGHT - PAD * 2)) / (max - min);

    const points = ratings.map((r, i) => `${x(i)},${y(r)}`).join(' ');
    const last = ratings.length - 1;

    // A completely flat line has no peak or dip worth pointing out.
    const extremes =
        highest > lowest
            ? [
                  { i: ratings.indexOf(highest), color: 'var(--series-high)' },
                  { i: ratings.indexOf(lowest), color: 'var(--series-low)' },
              ]
            : [];
    // When the last season is the peak or the dip, the end dot takes its colour.
    const endColor =
        extremes.find((e) => e.i === last)?.color ?? 'var(--series)';

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
            {extremes
                .filter((e) => e.i !== last)
                .map((e) => (
                    <circle
                        key={e.i}
                        cx={x(e.i)}
                        cy={y(ratings[e.i])}
                        r={3}
                        fill={e.color}
                        stroke="var(--surface)"
                        strokeWidth={1.5}
                    />
                ))}
            <circle
                cx={x(last)}
                cy={y(ratings[last])}
                r={4}
                fill={endColor}
                stroke="var(--surface)"
                strokeWidth={2}
            />
        </svg>
    );
}
