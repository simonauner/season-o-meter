// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import axios from '../../../server/apiClient';

export default async function handler(req, res) {
    const response = await axios.get('/tv/top_rated');
    res.status(200).json(response.data);
}
