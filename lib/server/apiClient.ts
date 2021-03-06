import axios from 'axios';

const instance = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    timeout: 1000,
});

instance.interceptors.request.use((config) => {
    config.params = {
        // add default qs
        api_key: process.env.API_KEY,
        // spread the request's params
        ...config.params,
    };
    return config;
});

export default instance;
