import { apiSlice } from './apiSlice';

export const purchaseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.paymentStatus) searchParams.set('paymentStatus', params.paymentStatus);
        const qs = searchParams.toString();
        return `/purchases${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Purchases'],
    }),
    getPurchasesBySupplier: builder.query({
      query: (supplierId) => `/purchases/supplier/${supplierId}`,
      providesTags: ['Purchases'],
    }),
    getPurchaseById: builder.query({
      query: (id) => `/purchases/${id}`,
      providesTags: (result, error, id) => [{ type: 'Purchases', id }],
    }),
    createPurchase: builder.mutation({
      query: (data) => ({
        url: '/purchases',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Purchases', 'Suppliers', 'Products', 'Batches', 'Dashboard'],
    }),
    updatePurchasePayment: builder.mutation({
      query: ({ id, paymentStatus }) => ({
        url: `/purchases/${id}/payment`,
        method: 'PATCH',
        body: { paymentStatus },
      }),
      invalidatesTags: ['Purchases', 'Suppliers', 'Dashboard'],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetPurchasesBySupplierQuery,
  useGetPurchaseByIdQuery,
  useCreatePurchaseMutation,
  useUpdatePurchasePaymentMutation,
} = purchaseApi;
