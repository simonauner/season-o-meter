import React, { FunctionComponent } from 'react';
import { Card } from '../Card/Card';
import { useGetTrendingTvShowsQuery } from '../../lib/showsService';
import { List } from 'antd';

export const ShowList: FunctionComponent = () => {
    const { data, isLoading } = useGetTrendingTvShowsQuery();

    if (!data) return null;

    return (
        <List
            loading={isLoading}
            grid={{
                gutter: 16,
                xs: 1,
                sm: 2,
                md: 2,
                lg: 3,
                xl: 4,
                xxl: 6,
            }}
            dataSource={data.results}
            renderItem={(item) => (
                <List.Item>
                    <Card data={item}>Card content</Card>
                </List.Item>
            )}
        />
    );
    return;
};
