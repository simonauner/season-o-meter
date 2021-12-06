import * as React from 'react';
import { FC } from 'react';
import { tvShowDetails } from '../../lib/types';
import { StarTwoTone } from '@ant-design/icons';
import { LineGraph } from '../LineGraph';
import css from './showDetails.module.css';
import { Content } from '../Layout';
import { Space, Spin, Statistic, Typography } from 'antd';
import dayjs from 'dayjs';
import { Conclusion } from '../Conclusion/Conclusion';
type ShowDetailsProps = {
    data: tvShowDetails;
    isLoading?: boolean;
};

export const ShowDetails: FC<ShowDetailsProps> = ({ data, isLoading }) => {
    const highestRatedSeason = data?.seasons.reduce((prev, curr) =>
        curr.rating > prev.rating ? curr : prev
    );
    const lowestRatedSeason = data?.seasons.reduce((prev, curr) =>
        curr.rating < prev.rating ? curr : prev
    );

    return (
        <Content>
            <div className={css.base}>
                <Spin spinning={isLoading}>
                    <div className={css.left}>
                        <img
                            src={`https://image.tmdb.org/t/p/w300/${data?.poster_path}`}
                        />
                        <div className={css.meta}>
                            <Typography.Title level={1}>
                                {data?.name} (
                                {data &&
                                    dayjs(data?.first_air_date).format('YYYY')}
                                {data?.last_air_date
                                    ? `-${dayjs(data?.last_air_date).format(
                                          'YYYY'
                                      )}`
                                    : '--'}
                                )
                            </Typography.Title>
                            <Conclusion
                                ended={!data?.in_production}
                                showRating={data?.vote_average}
                                seasons={data?.seasons}
                            />
                            <Space direction="vertical">
                                <Statistic
                                    title="Show average rating"
                                    value={data?.vote_average}
                                    precision={1}
                                    prefix={
                                        <StarTwoTone twoToneColor="#faad14" />
                                    }
                                />
                                <Statistic
                                    title="Highest rated season"
                                    value={highestRatedSeason?.rating}
                                    precision={1}
                                    prefix={
                                        <>
                                            {highestRatedSeason?.season_number}{' '}
                                            {dayjs(
                                                highestRatedSeason?.air_date
                                            ).format('(YYYY)')}{' '}
                                            <StarTwoTone twoToneColor="#faad14" />
                                        </>
                                    }
                                />
                                <Statistic
                                    title="Lowest rated season"
                                    value={lowestRatedSeason?.rating}
                                    precision={1}
                                    prefix={
                                        <>
                                            {lowestRatedSeason?.season_number}{' '}
                                            {dayjs(
                                                lowestRatedSeason?.air_date
                                            ).format('(YYYY)')}{' '}
                                            <StarTwoTone twoToneColor="#faad14" />
                                        </>
                                    }
                                />
                            </Space>
                        </div>
                    </div>
                    <div className={css.right}>
                        <LineGraph size="large" data={data?.seasons} />
                    </div>
                    <div className={css.bottom}></div>
                </Spin>
            </div>
        </Content>
    );
};
