import { apiSlice } from './apiSlice';

export const supplierApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query({
      query: (keyword) => `/suppliers${keyword ? `?keyword=${keyword}` : ''}`,
      providesTags: ['Suppliers'],
    }),
    getSupplierById: builder.query({
      query: (id) => `/suppliers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Suppliers', id }],
    }),
    createSupplier: builder.mutation({
      query: (data) => ({
        url: '/suppliers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Suppliers'],
    }),
    updateSupplier: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/suppliers/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Suppliers'],
    }),
    deleteSupplier: builder.mutation({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Suppliers'],
    }),
    recordSupplierPayment: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/suppliers/${id}/payment`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Suppliers', 'Purchases', 'Dashboard'],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierByIdQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useRecordSupplierPaymentMutation,
} = supplierApi;
