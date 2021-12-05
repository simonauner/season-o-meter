// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { TopRatedSeriesResponse } from '../../../lib/types';
import axios from '../../../server/apiClient';

export default async function handler(req, res) {
    const { data } = await axios.get<TopRatedSeriesResponse>(
        '/trending/tv/week'
    );

    if (!data) return res.status(200).json(data);

    data.results.forEach((tvShow) => {
        const { data: tvShowDetails } = axios.get();
    });

    res.status(200).json(data);
}
