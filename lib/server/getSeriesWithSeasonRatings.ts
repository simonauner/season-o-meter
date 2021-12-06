import {
    tvShowDetails,
    tvShowDetailsResponse,
    tvShowSeasonDetailsResponse,
} from '../types';
import axios from './apiClient';

export const getSeriesWithSeasonRatings = async (id: number) => {
    const { data: showDetails } = await axios.get<tvShowDetailsResponse>(
        `/tv/${id}`
    );

    const ratingPerSeason = await Promise.all(
        new Array(showDetails.number_of_seasons)
            .fill(undefined)
            .map(async (s, index) => {
                const { data: seasonDetails } =
                    await axios.get<tvShowSeasonDetailsResponse>(
                        `/tv/${id}/season/${index + 1}`
                    );
                const averageRating = seasonDetails.episodes.reduce(
                    (prev, curr) => prev + curr.vote_average,
                    0
                );
                return Number(
                    (averageRating / seasonDetails.episodes.length).toFixed(1)
                );
            })
    );
    return {
        ...showDetails,
        seasons: showDetails.seasons
            .filter((season) => season.season_number > 0)
            .map((season, index) => ({
                ...season,
                rating: ratingPerSeason[season.season_number - 1],
            })),
    };
};
