import { formatChange } from '@/lib/format';
import type { RatedSeason } from '@/lib/types';
import { ratingKey } from '@/lib/userData';
import { RatingChart } from './RatingChart';

export function SeasonChart({
    showId,
    seasons,
}: {
    showId: string;
    seasons: RatedSeason[];
}) {
    return (
        <RatingChart
            label="Season rating chart. Use the arrow keys to step through seasons."
            ownKeys={seasons.map((season) =>
                ratingKey(showId, season.seasonNumber)
            )}
            points={seasons.map((season, i) => {
                const previous = seasons[i - 1];
                return {
                    key: season.seasonNumber,
                    axisLabel: `S${season.seasonNumber}`,
                    rating: season.rating,
                    title: `Season ${season.seasonNumber}${season.year ? ` · ${season.year}` : ''}`,
                    detail: `${season.ratedEpisodeCount} rated episodes${previous ? ` · ${formatChange(season.rating - previous.rating)} vs S${previous.seasonNumber}` : ''}`,
                };
            })}
        />
    );
}
