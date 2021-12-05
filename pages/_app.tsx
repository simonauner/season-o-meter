import '../styles/globals.css';

type MyAppProps = {
    Component: React.FunctionComponent;
    pageProps: Record<string, any>;
};

const MyApp: React.FunctionComponent<MyAppProps> = ({
    Component,
    pageProps,
}) => {
    return <Component {...pageProps} />;
};

export default MyApp;
