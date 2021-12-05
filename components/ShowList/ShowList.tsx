import React, { FunctionComponent } from 'react';
import { Card } from '../Card/Card';
import { useGetTrendingTvShowsQuery } from '../../lib/showsService';

export const ShowList: FunctionComponent = () => {
    const { data } = useGetTrendingTvShowsQuery();
    console.log(data);

    if (!data) return null;

    return (
        <div className="container">
            <div className="row gy-3 gx-3">
                {data?.results.map((tv) => (
                    <div key={tv.id} className="col-6 col-md-4">
                        <Card data={tv} />
                    </div>
                ))}
            </div>
        </div>
    );
    return;
};
