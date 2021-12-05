// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import axios from '../../server/apiClient';

export default async function handler(req, res) {
    const response = await axios.get('/movie/550');
    res.status(200).json(response.data);
}
