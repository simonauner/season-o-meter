import * as React from 'react';
import { FC } from 'react';
import { tvShowDetails } from '../../lib/types';
import { StarOutlined } from '@ant-design/icons';
import { LineGraph } from '../LineGraph';
import css from './showDetails.module.css';
import { Content } from '../Content';
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
        <Content>
            <div className={css.base}>
                <div className={css.left}>
                    <img
                        src={`https://image.tmdb.org/t/p/w300/${data?.poster_path}`}
                    />
                </div>
                <div className={css.right}>
                    <div className={css.meta}>
                        Show average rating: {data?.vote_average}
                        Highest rated season: {highestRatedSeason?.id}{' '}
                        <StarOutlined /> {highestRatedSeason?.rating}
                        Lowest rated season: {lowestRatedSeason?.id}{' '}
                        <StarOutlined />
                        {lowestRatedSeason?.rating}
                    </div>
                    <LineGraph size="large" data={data?.rating} />
                </div>
                <div className={css.bottom}></div>
            </div>
        </Content>
    );
};
