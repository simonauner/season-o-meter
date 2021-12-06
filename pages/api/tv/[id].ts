// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
    tvShowDetailsResponse,
    tvShowSeasonDetailsResponse,
} from '../../../lib/types';
import axios from '../../../lib/server/apiClient';
import { getSeriesWithSeasonRatings } from '../../../lib/server/getSeriesWithSeasonRatings';

export default async function handler(req, res) {
    const detailsWithRating = await getSeriesWithSeasonRatings(req.query.id);

    // const { data: details } = await axios.get<tvShowDetailsResponse>(
    //     `/tv/${req.query.id}`
    // );

    // const averageRatingPerSeason = await Promise.all(
    //     new Array(details.number_of_seasons)
    //         .fill(undefined)
    //         .map(async (s, index) => {
    //             const { data: seasonDetails } =
    //                 await axios.get<tvShowSeasonDetailsResponse>(
    //                     `/tv/${details.id}/season/${index + 1}`
    //                 );
    //             const averageRating = seasonDetails.episodes.reduce(
    //                 (prev, curr) => prev + curr.vote_average,
    //                 0
    //             );
    //             return (averageRating / seasonDetails.episodes.length).toFixed(
    //                 1
    //             );
    //         })
    // );

    // const seasonsWithRating = details.seasons
    //     .map((season, index) => ({
    //         ...season,
    //         rating: Number(averageRatingPerSeason[season.season_number - 1]),
    //     }))
    //     .filter((season) => season.season_number > 0);

    // const detailsWithRating = {
    //     ...details,
    //     seasons: seasonsWithRating,
    // };

    res.status(200).json(detailsWithRating);
}
