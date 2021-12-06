// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
    TopRatedSeriesResponse,
    tvShowDetailsResponse,
    tvShowSeasonDetailsResponse,
} from '../../../lib/types';
import axios from '../../../server/apiClient';

export default async function handler(req, res) {
    const { data, status, statusText } =
        await axios.get<TopRatedSeriesResponse>('/trending/tv/week');

    if (status > 399) return res.status(status).text(statusText);

    if (!data) return res.status(status).json(data);

    const details = await Promise.all(
        data.results.map(async (tvShow) => {
            const { data: showDetails } =
                await axios.get<tvShowDetailsResponse>(`/tv/${tvShow.id}`);
            return showDetails;
        })
    );

    data.results = details.filter((tvShow) => tvShow.number_of_seasons > 1);

    const detailsWithSeasonsScore = await Promise.all(
        data.results.map(async (tvShow) => {
            const averageRatingPerSeason = Promise.all(
                new Array(tvShow.number_of_seasons)
                    .fill(undefined)
                    .map(async (s, index) => {
                        const { data: seasonDetails } =
                            await axios.get<tvShowSeasonDetailsResponse>(
                                `/tv/${tvShow.id}/season/${index + 1}`
                            );
                        const averageRating = seasonDetails.episodes.reduce(
                            (prev, curr) => prev + curr.vote_average,
                            0
                        );
                        return {
                            id: index + 1,
                            rating: Number(
                                (
                                    averageRating /
                                    seasonDetails.episodes.length
                                ).toFixed(1)
                            ),
                        };
                    })
            );
            return averageRatingPerSeason;
        })
    );

    data.results = data.results.map((result, index) => ({
        ...result,
        rating: detailsWithSeasonsScore[index],
    }));

    res.status(200).json(data);
}
