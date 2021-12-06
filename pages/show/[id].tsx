import { useRouter } from 'next/router';
import React from 'react';
import { useGetShowQuery } from '../../lib/showsService';
import { ShowDetails } from '../../components/ShowDetails';

export default function Home() {
    const { query } = useRouter();

    const { data } = useGetShowQuery(
        Array.isArray(query.id) ? query.id[0] : query.id
    );

    return <ShowDetails data={data} />;
}
