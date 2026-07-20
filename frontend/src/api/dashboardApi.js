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
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetDashboardChartsQuery,
  useGetRecentActivitiesQuery,
} = dashboardApi;
