import Head from 'next/head';
import React from 'react';
import { Content } from '../components/Content';
import { Footer } from '../components/Footer';
import { Hero } from '../components/Hero';
import { SeriesList } from '../components/ShowList';
import { TopMenu } from '../components/TopMenu';

export default function Home() {
    return (
        <>
            <Hero
                header="Series-o-meter"
                text="Where did your favorite series peak and from where did it go all down-hill?"
            />
            <Content>
                <SeriesList />
            </Content>
        </>
    );
}
