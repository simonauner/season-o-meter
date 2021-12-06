// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { TopRatedSeriesResponse, tvShowDetails } from '../../../lib/types';
import axios from '../../../lib/server/apiClient';
import { getSeriesWithSeasonRatings } from '../../../lib/server/getSeriesWithSeasonRatings';

export default async function handler(req, res) {
    const { data, status, statusText } =
        await axios.get<TopRatedSeriesResponse>('/tv/popular');

    if (status > 399) return res.status(status).text(statusText);

    if (!data) return res.status(status).json(data);

    const details = await Promise.allSettled(
        data.results.map((tvShow) => {
            return getSeriesWithSeasonRatings(tvShow.id);
        })
    );

    const results = details
        .filter((result) => result.status === 'fulfilled')
        .map(
            (result) => (result as PromiseFulfilledResult<tvShowDetails>)?.value
        );
    // .filter((result) => result);

    data.results = results.filter((tvShow) => tvShow?.number_of_seasons > 1);

    res.status(200).json(data);
}
