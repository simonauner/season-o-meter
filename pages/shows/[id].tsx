import { useRouter } from 'next/router';
import React from 'react';
import { useGetShowQuery } from '../../lib/showsService';
import { ShowDetails } from '../../components/ShowDetails';
import { Spin } from 'antd';

export default function Home() {
    const { query } = useRouter();
    const id = Array.isArray(query.id) ? query.id[0] : query.id;

    const { data, isLoading } = useGetShowQuery(id, { skip: !id });

    return <ShowDetails isLoading={isLoading} data={data} />;
}
