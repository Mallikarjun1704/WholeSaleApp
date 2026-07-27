import { apiSlice } from './apiSlice';

export const expenseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams(params || {}).toString();
        return `/expenses${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: ['Expenses', 'Dashboard'],
    }),
    createExpense: builder.mutation({
      query: (data) => ({
        url: '/expenses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Expenses', 'Dashboard'],
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Expenses', 'Dashboard'],
    }),
  }),
});

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
} = expenseApi;
