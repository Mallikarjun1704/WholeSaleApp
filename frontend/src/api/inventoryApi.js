import { apiSlice } from './apiSlice';

export const inventoryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.keyword) searchParams.set('keyword', params.keyword);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.brand) searchParams.set('brand', params.brand);
        const qs = searchParams.toString();
        return `/inventory${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Products', 'Batches'],
    }),
    createProduct: builder.mutation({
      query: (data) => ({
        url: '/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Products', 'Dashboard'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Products', 'Dashboard'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products', 'Dashboard'],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = inventoryApi;
