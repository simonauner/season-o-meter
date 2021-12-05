// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type TopRatedSeriesResponse = {
    page: number;
    total_pages: number;
    total_results: number;
    results: Array<Series>;
};

type Series = {
    name: string;
    id: number;
};

// Define a service using a base URL and expected endpoints
export const pokemonApi = createApi({
    reducerPath: 'seriesApi',
    baseQuery: fetchBaseQuery({ baseUrl: '/api/series' }),
    endpoints: (builder) => ({
        getTopRatedSeries: builder.query<TopRatedSeriesResponse, void>({
            query: (name) => `/toprated`,
        }),
    }),
});

// Export hooks for usage in functional components, which are
// auto-generated based on the defined endpoints
export const { useGetTopRatedSeriesQuery } = pokemonApi;
