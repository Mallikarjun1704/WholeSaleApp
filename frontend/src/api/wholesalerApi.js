import { apiSlice } from './apiSlice';

export const wholesalerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWholesalerSellers: builder.query({
      query: () => '/wholesaler/sellers',
      providesTags: ['WholesalerSellers'],
    }),
    createWholesalerSeller: builder.mutation({
      query: (data) => ({
        url: '/wholesaler/seller',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WholesalerSellers'],
    }),
    importWholesalerPrices: builder.mutation({
      query: (data) => ({
        url: '/wholesaler/import',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WholesalerPrices'],
    }),
    getWholesalerPrices: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.set('search', params.search);
        if (params?.brand) searchParams.set('brand', params.brand);
        if (params?.color) searchParams.set('color', params.color);
        if (params?.variant) searchParams.set('variant', params.variant);
        if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
        if (params?.importDate) searchParams.set('importDate', params.importDate);
        if (params?.page) searchParams.set('page', params.page);
        if (params?.limit) searchParams.set('limit', params.limit);
        if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
        if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
        const qs = searchParams.toString();
        return `/wholesaler/prices${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['WholesalerPrices'],
    }),
    getWholesalerHistory: builder.query({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.phoneName) searchParams.set('phoneName', params.phoneName);
        if (params?.model) searchParams.set('model', params.model);
        if (params?.variant) searchParams.set('variant', params.variant);
        if (params?.color) searchParams.set('color', params.color);
        if (params?.sellerId) searchParams.set('sellerId', params.sellerId);
        const qs = searchParams.toString();
        return `/wholesaler/history${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['WholesalerPrices'],
    }),
    deleteWholesalerImport: builder.mutation({
      query: ({ sellerId, importDate }) => ({
        url: `/wholesaler/import?sellerId=${sellerId}&importDate=${importDate}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WholesalerPrices'],
    }),
    deleteSellerPrices: builder.mutation({
      query: (sellerId) => ({
        url: `/wholesaler/seller-prices/${sellerId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WholesalerPrices'],
    }),
    getWholesalerNormalizations: builder.query({
      query: () => '/wholesaler/normalizations',
      providesTags: ['WholesalerNormalizations'],
    }),
    addWholesalerNormalization: builder.mutation({
      query: (data) => ({
        url: '/wholesaler/normalizations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WholesalerNormalizations'],
    }),
  }),
});

export const {
  useGetWholesalerSellersQuery,
  useCreateWholesalerSellerMutation,
  useImportWholesalerPricesMutation,
  useGetWholesalerPricesQuery,
  useGetWholesalerHistoryQuery,
  useDeleteWholesalerImportMutation,
  useDeleteSellerPricesMutation,
  useGetWholesalerNormalizationsQuery,
  useAddWholesalerNormalizationMutation,
} = wholesalerApi;
