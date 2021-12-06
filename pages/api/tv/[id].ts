import { getSeriesWithSeasonRatings } from '../../../lib/server/getSeriesWithSeasonRatings';

export default async function handler(req, res) {
    const detailsWithRating = await getSeriesWithSeasonRatings(req.query.id);

    res.status(200).json(detailsWithRating);
}
