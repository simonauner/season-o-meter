import * as React from 'react';
import { FC } from 'react';
import { tvShowDetails } from '../../lib/types';
import { StarIcon } from '../Icons';
import { LineGraph } from '../LineGraph';
import css from './showDetails.module.css';
type ShowDetailsProps = {
    data: tvShowDetails;
};

export const ShowDetails: FC<ShowDetailsProps> = ({ data }) => {
    const highestRatedSeason = data?.rating.reduce((prev, curr) =>
        curr.rating > prev.rating ? curr : prev
    );
    const lowestRatedSeason = data?.rating.reduce((prev, curr) =>
        curr.rating < prev.rating ? curr : prev
    );

    return (
        <div className="row my-5">
            <div className="col-md-auto">
                <img
                    src={`https://image.tmdb.org/t/p/w300/${data?.poster_path}`}
                />
            </div>
            <div className="col-md-auto">
                Show average rating: {data?.vote_average}
                Highest rated season: {highestRatedSeason?.id}{' '}
                <StarIcon inline /> {highestRatedSeason?.rating}
                Lowest rated season: {lowestRatedSeason?.id} <StarIcon inline />
                {lowestRatedSeason?.rating}
                <LineGraph
                    className={css.graph}
                    size="large"
                    data={data?.rating}
                />
            </div>
        </div>
    );
};
