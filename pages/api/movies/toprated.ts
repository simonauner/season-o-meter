// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import axios from '../../../server/apiClient';

export default async function handler(req, res) {
    const { data } = await axios.get('/movie/top_rated');

    if (!data) res.status(204).json(data);

    // data.results.forEach((tvShow) => {
    //     const { data: tvShowDetails } = axios.get();
    // });

    res.status(200).json(data);
}
