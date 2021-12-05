import React from 'react';
import { Provider } from 'react-redux';
import { store } from '../lib/store';

import 'bootstrap/dist/css/bootstrap.css';
import '../styles/globals.css';

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
            <Component {...pageProps} />
        </Provider>
    );
};

export default MyApp;
