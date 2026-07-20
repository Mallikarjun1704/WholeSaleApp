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
  }),
});

export const {
  useGetInventoryQuery,
} = inventoryApi;
