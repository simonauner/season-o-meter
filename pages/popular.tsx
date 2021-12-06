import React from 'react';
import { Content } from '../components/Layout';
import { Hero } from '../components/Hero';
import { ShowList } from '../components/ShowList';
import { useGetPopularTvShowsQuery } from '../lib/showsService';

export default function Home() {
    return (
        <>
            <Hero
                header="Series-o-meter"
                text="Where did your favorite series peak and from where did it go all down-hill?"
            />
            <Content>
                <ShowList query={useGetPopularTvShowsQuery} />
            </Content>
        </>
    );
}
