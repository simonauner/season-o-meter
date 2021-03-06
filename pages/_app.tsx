import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../lib/store';
import 'antd/dist/antd.css'; // or 'antd/dist/antd.less'
import '../styles/globals.css';
import { Layout } from 'antd';
import { Footer } from '../components/Footer';

import { TopMenu } from '../components/TopMenu';
import { ContentWrapper } from '../components/Layout';

type MyAppProps = {
    Component: React.FunctionComponent;
    pageProps: Record<string, any>;
};

const MyApp: React.FunctionComponent<MyAppProps> = ({
    Component,
    pageProps,
}) => {
    return (
        <Provider store={store}>
            <Layout>
                <TopMenu />
                <ContentWrapper>
                    <Component {...pageProps} />
                </ContentWrapper>
                <Footer />
            </Layout>
        </Provider>
    );
};

export default MyApp;
