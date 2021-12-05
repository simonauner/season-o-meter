import { useRouter } from 'next/router';
import React from 'react';
import { Footer } from '../../components/Footer';
import { useGetShowQuery } from '../../lib/showsService';
import { ShowDetails } from '../../components/ShowDetails';
import { TopMenu } from '../../components/TopMenu';

export default function Home() {
    const { query } = useRouter();

    const { data } = useGetShowQuery(
        Array.isArray(query.id) ? query.id[0] : query.id
    );

    return (
        <>
            <TopMenu />
            <div className="container">
                <ShowDetails data={data} />
            </div>
            <Footer />
        </>
    );
}
