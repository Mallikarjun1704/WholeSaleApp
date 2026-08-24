import { apiSlice } from './apiSlice';

export const customerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query({
      query: (keyword) => `/customers${keyword ? `?keyword=${keyword}` : ''}`,
      providesTags: ['Customers'],
    }),
    getCustomerById: builder.query({
      query: (id) => `/customers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Customers', id }],
    }),
    createCustomer: builder.mutation({
      query: (data) => ({
        url: '/customers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Customers'],
    }),
    updateCustomer: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/customers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Customers'],
    }),
    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `/customers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Customers'],
    }),
    recordCustomerPayment: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/customers/${id}/payment`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Customers', 'Bills', 'Dashboard'],
    }),
    getCustomerStatement: builder.query({
      query: ({ id, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const qs = params.toString();
        return `/customers/${id}/statement${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Customers', 'Bills'],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useRecordCustomerPaymentMutation,
  useGetCustomerStatementQuery,
} = customerApi;
