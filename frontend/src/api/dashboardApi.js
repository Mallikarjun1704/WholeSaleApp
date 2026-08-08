import { apiSlice } from './apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
    }),
    getDashboardCharts: builder.query({
      query: () => '/dashboard/charts',
      providesTags: ['Dashboard'],
    }),
    getRecentActivities: builder.query({
      query: () => '/dashboard/activities',
      providesTags: ['ActivityLogs'],
    }),
    getDashboardDetails: builder.query({
      query: (type) => `/dashboard/details/${type}`,
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetDashboardChartsQuery,
  useGetRecentActivitiesQuery,
  useGetDashboardDetailsQuery,
} = dashboardApi;
