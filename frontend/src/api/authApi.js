import { apiSlice } from './apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Setup', 'Auth'],
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    checkSetup: builder.query({
      query: () => '/auth/check-setup',
      providesTags: ['Setup'],
    }),
    setup: builder.mutation({
      query: (data) => ({
        url: '/auth/setup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Setup', 'Auth'],
    }),
    updatePassword: builder.mutation({
      query: (data) => ({
        url: '/auth/password',
        method: 'PUT',
        body: data,
      }),
    }),
    getUsers: builder.query({
      query: () => '/auth/users',
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (data) => ({
        url: '/auth/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Users'],
    }),
    toggleUserAccess: builder.mutation({
      query: (id) => ({
        url: `/auth/users/${id}/toggle-access`,
        method: 'PUT',
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useCheckSetupQuery,
  useSetupMutation,
  useUpdatePasswordMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useToggleUserAccessMutation,
} = authApi;
