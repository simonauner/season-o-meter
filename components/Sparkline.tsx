import type { RatedSeason } from '@/lib/types';

const WIDTH = 240;
const HEIGHT = 56;
const PAD = 6;

/** Small, static season-by-season rating line for show cards. */
export function Sparkline({ seasons }: { seasons: RatedSeason[] }) {
    if (seasons.length < 2) return null;

    const ratings = seasons.map((season) => season.rating);
    const min = Math.min(...ratings);
    // Keep flat-ish shows looking flat instead of exaggerating tiny wobbles.
    const max = Math.max(...ratings, min + 1);

    const x = (i: number) =>
        PAD + (i * (WIDTH - PAD * 2)) / (seasons.length - 1);
    const y = (rating: number) =>
        PAD + ((max - rating) * (HEIGHT - PAD * 2)) / (max - min);

    const points = seasons.map((s, i) => `${x(i)},${y(s.rating)}`).join(' ');
    const last = seasons.length - 1;

    return (
        <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            width="100%"
            role="img"
            aria-label={`Season ratings: ${seasons
                .map((s) => `S${s.seasonNumber} ${s.rating.toFixed(1)}`)
                .join(', ')}`}
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
                cy={y(seasons[last].rating)}
                r={4}
                fill="var(--series)"
                stroke="var(--surface)"
                strokeWidth={2}
            />
        </svg>
    );
}
