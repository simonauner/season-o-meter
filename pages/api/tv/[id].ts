// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
    tvShowDetailsResponse,
    tvShowSeasonDetailsResponse,
} from '../../../lib/types';
import axios from '../../../server/apiClient';

export default async function handler(req, res) {
    const { data: details } = await axios.get<tvShowDetailsResponse>(
        `/tv/${req.query.id}`
    );

    const averageRatingPerSeason = await Promise.all(
        new Array(details.number_of_seasons)
            .fill(undefined)
            .map(async (s, index) => {
                const { data: seasonDetails } =
                    await axios.get<tvShowSeasonDetailsResponse>(
                        `/tv/${details.id}/season/${index + 1}`
                    );
                const averageRating = seasonDetails.episodes.reduce(
                    (prev, curr) => prev + curr.vote_average,
                    0
                );
                return (averageRating / seasonDetails.episodes.length).toFixed(
                    1
                );
            })
    );

    const twoDimensional = averageRatingPerSeason?.map((rating, index) => ({
        id: index + 1,
        rating: Number(rating),
    }));

    const detailsWithRating = {
        ...details,
        rating: twoDimensional,
    };

    res.status(200).json(detailsWithRating);
}
