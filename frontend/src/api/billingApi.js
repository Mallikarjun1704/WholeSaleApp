import { apiSlice } from './apiSlice';

export const billingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBills: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.customerId) searchParams.set('customerId', params.customerId);
        const qs = searchParams.toString();
        return `/billing${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Bills'],
    }),
    getBillById: builder.query({
      query: (id) => `/billing/${id}`,
      providesTags: (result, error, id) => [{ type: 'Bills', id }],
    }),
    getBillsByCustomer: builder.query({
      query: (customerId) => `/billing/customer/${customerId}`,
      providesTags: ['Bills'],
    }),
    createBill: builder.mutation({
      query: (data) => ({
        url: '/billing',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Bills', 'Customers', 'Products', 'Batches', 'Dashboard'],
    }),
    updateBillPayment: builder.mutation({
      query: ({ id, status }) => ({
        url: `/billing/${id}/payment`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Bills', 'Customers', 'Dashboard'],
    }),
  }),
});

export const {
  useGetBillsQuery,
  useGetBillByIdQuery,
  useGetBillsByCustomerQuery,
  useCreateBillMutation,
  useUpdateBillPaymentMutation,
} = billingApi;
