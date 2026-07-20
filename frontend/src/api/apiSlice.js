import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Wrapper that handles token refresh on 401
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result?.error?.status === 401 && result?.error?.data?.code === 'TOKEN_EXPIRED') {
    const refreshToken = api.getState().auth.refreshToken;

    if (refreshToken) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult?.data?.success) {
        // Store new tokens
        api.dispatch({
          type: 'auth/tokenRefreshed',
          payload: refreshResult.data.data,
        });

        // Retry the original request
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed - logout
        api.dispatch({ type: 'auth/logout' });
      }
    } else {
      api.dispatch({ type: 'auth/logout' });
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'Dashboard',
    'Products',
    'Batches',
    'Customers',
    'Suppliers',
    'Bills',
    'Credits',
    'Reports',
    'Expenses',
    'ExpenseCategories',
    'Settings',
    'Users',
    'Notifications',
    'ActivityLogs',
  ],
  endpoints: () => ({}),
});
