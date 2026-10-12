import type { SeasonTrend } from '@/lib/analysis';
import { formatChange, formatRating, year } from '@/lib/format';
import type { SeasonRating } from '@/lib/types';
import css from './seasonTable.module.css';

type SeasonTableProps = {
    seasons: SeasonRating[];
    trend: SeasonTrend | null;
};

/** Rating change compared with the closest earlier rated season. */
const changes = (seasons: SeasonRating[]) =>
    seasons.map((season, index) => {
        const previous = seasons
            .slice(0, index)
            .findLast((earlier) => earlier.rating !== null);
        return season.rating !== null && previous?.rating != null
            ? season.rating - previous.rating
            : null;
    });

export function SeasonTable({ seasons, trend }: SeasonTableProps) {
    const seasonChanges = changes(seasons);

    return (
        <div className={css.scroll}>
            <table className={css.table}>
                <thead>
                    <tr>
                        <th scope="col">Season</th>
                        <th scope="col">Aired</th>
                        <th scope="col" className={css.num}>
                            Rated episodes
                        </th>
                        <th scope="col" className={css.num}>
                            Rating
                        </th>
                        <th scope="col" className={css.num}>
                            Change
                        </th>
                        <th scope="col" className={css.barCol}>
                            <span className="visually-hidden">Rating bar</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {seasons.map((season, index) => {
                        const change = seasonChanges[index];
                        const tag =
                            trend?.best.seasonNumber === season.seasonNumber
                                ? 'Best'
                                : trend?.worst.seasonNumber ===
                                    season.seasonNumber
                                  ? 'Worst'
                                  : null;

                        return (
                            <tr key={season.seasonNumber}>
                                <th scope="row">
                                    {season.seasonNumber}
                                    {tag && (
                                        <span className={css.tag}>{tag}</span>
                                    )}
                                </th>
                                <td>{year(season.airDate) ?? 'TBA'}</td>
                                <td className={css.num}>
                                    {season.ratedEpisodeCount}/
                                    {season.episodeCount}
                                </td>
                                <td className={`${css.num} ${css.rating}`}>
                                    {season.rating === null
                                        ? '–'
                                        : formatRating(season.rating)}
                                </td>
                                <td
                                    className={`${css.num} ${
                                        change === null
                                            ? ''
                                            : change >= 0.05
                                              ? css.up
                                              : change <= -0.05
                                                ? css.down
                                                : ''
                                    }`}
                                >
                                    {change === null
                                        ? ''
                                        : formatChange(change)}
                                </td>
                                <td className={css.barCol}>
                                    {season.rating !== null && (
                                        <span
                                            className={css.bar}
                                            style={{
                                                width: `${season.rating * 10}%`,
                                            }}
                                        />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
