import React, { FunctionComponent } from 'react';
import { Card } from '../Card/Card';
import { useGetTrendingTvShowsQuery } from '../../lib/showsService';
import { List } from 'antd';

type ShowListProps = {
    query: typeof useGetTrendingTvShowsQuery;
};

export const ShowList: FunctionComponent<ShowListProps> = ({ query }) => {
    const { data, isLoading } = query();

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
            dataSource={data?.results}
            renderItem={(item) => (
                <List.Item>
                    <Card data={item}>Card content</Card>
                </List.Item>
            )}
        />
    );
    return;
};
