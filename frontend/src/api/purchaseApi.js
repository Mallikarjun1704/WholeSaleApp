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
    getNextInvoiceNumber: builder.query({
      query: () => '/purchases/next-invoice',
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
      query: ({ id, paymentStatus, amount }) => ({
        url: `/purchases/${id}/payment`,
        method: 'PATCH',
        body: { paymentStatus, amount },
      }),
      invalidatesTags: ['Purchases', 'Suppliers', 'Dashboard'],
    }),
    updatePurchase: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/purchases/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Purchases', 'Suppliers', 'Products', 'Batches', 'Dashboard'],
    }),
  }),
});

export const {
  useGetPurchasesQuery,
  useGetPurchasesBySupplierQuery,
  useGetPurchaseByIdQuery,
  useGetNextInvoiceNumberQuery,
  useLazyGetNextInvoiceNumberQuery,
  useCreatePurchaseMutation,
  useUpdatePurchasePaymentMutation,
  useUpdatePurchaseMutation,
} = purchaseApi;
