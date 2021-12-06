// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { TopRatedSeriesResponse, TopRatedSeries, tvShowDetails } from './types';

// Define a service using a base URL and expected endpoints

export const showsApi = createApi({
    reducerPath: 'showsApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api/tv' }),
    endpoints: (builder) => ({
        getTopRatedTvShows: builder.query<TopRatedSeries, void>({
            query: () => `/toprated`,
        }),
        getTrendingTvShows: builder.query<TopRatedSeries, void>({
            query: () => `/trending`,
        }),
        getPopularTvShows: builder.query<TopRatedSeries, void>({
            query: () => `/popular`,
        }),
        getShow: builder.query<tvShowDetails, number>({
            query: (id) => `/${id}`,
        }),
    }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const {
    useGetTopRatedTvShowsQuery,
    useGetTrendingTvShowsQuery,
    useGetShowQuery,
    useGetPopularTvShowsQuery,
} = showsApi;
