import { apiSlice } from './apiSlice';

export const investmentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInvestments: builder.query({
      query: () => '/investments',
      providesTags: ['Investments', 'Dashboard'],
    }),
    createInvestment: builder.mutation({
      query: (data) => ({
        url: '/investments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Investments', 'Dashboard'],
    }),
    deleteInvestment: builder.mutation({
      query: (id) => ({
        url: `/investments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Investments', 'Dashboard'],
    }),
  }),
});

export const {
  useGetInvestmentsQuery,
  useCreateInvestmentMutation,
  useDeleteInvestmentMutation,
} = investmentApi;
