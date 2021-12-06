// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import queryString from 'query-string';

import { TopRatedSeriesResponse, tvShowDetails } from '../../../lib/types';
import axios from '../../../lib/server/apiClient';
import { getSeriesWithSeasonRatings } from '../../../lib/server/getSeriesWithSeasonRatings';

export default async function handler(req, res) {
    const { data, status, statusText } =
        await axios.get<TopRatedSeriesResponse>(
            `search/tv?${queryString.stringify(req.query)}`
        );

    if (status > 399) return res.status(status).text(statusText);

    if (!data) return res.status(status).json(data);

    res.status(200).json(data);
}
