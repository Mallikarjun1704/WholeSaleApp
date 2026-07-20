import { createSlice } from '@reduxjs/toolkit';

// Load persisted auth state from localStorage
const loadAuthState = () => {
  try {
    const serialized = localStorage.getItem('techmart_auth');
    if (serialized) {
      return JSON.parse(serialized);
    }
  } catch (e) {
    // Ignore errors
  }
  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  };
};

const initialState = loadAuthState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;

      // Persist to localStorage
      localStorage.setItem(
        'techmart_auth',
        JSON.stringify({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })
      );
    },
    tokenRefreshed: (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;

      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('techmart_auth') || '{}');
      localStorage.setItem(
        'techmart_auth',
        JSON.stringify({
          ...stored,
          accessToken,
          refreshToken,
        })
      );
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('techmart_auth');
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      const stored = JSON.parse(localStorage.getItem('techmart_auth') || '{}');
      localStorage.setItem(
        'techmart_auth',
        JSON.stringify({ ...stored, user: state.user })
      );
    },
  },
});

export const { setCredentials, tokenRefreshed, logout, updateUser } = authSlice.actions;

// Selectors
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUserRole = (state) => state.auth.user?.role;
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin';

export default authSlice.reducer;
