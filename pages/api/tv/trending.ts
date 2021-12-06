// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
    TopRatedSeriesResponse,
    tvShowDetailsResponse,
    tvShowSeasonDetailsResponse,
} from '../../../lib/types';
import axios from '../../../lib/server/apiClient';
import { getSeriesWithSeasonRatings } from '../../../lib/server/getSeriesWithSeasonRatings';

export default async function handler(req, res) {
    const { data, status, statusText } =
        await axios.get<TopRatedSeriesResponse>('/trending/tv/week');

    if (status > 399) return res.status(status).text(statusText);

    if (!data) return res.status(status).json(data);

    const details = await Promise.all(
        data.results.map(async (tvShow) => {
            return await getSeriesWithSeasonRatings(tvShow.id);
        })
    );

    data.results = details.filter((tvShow) => tvShow.number_of_seasons > 1);

    res.status(200).json(data);
}
