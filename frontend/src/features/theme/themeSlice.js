import { createSlice } from '@reduxjs/toolkit';

const loadThemeMode = () => {
  try {
    return localStorage.getItem('techmart_theme') || 'dark';
  } catch {
    return 'dark';
  }
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: loadThemeMode(),
    sidebarOpen: true,
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('techmart_theme', state.mode);
    },
    setThemeMode: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('techmart_theme', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleTheme, setThemeMode, toggleSidebar, setSidebarOpen } = themeSlice.actions;

export const selectThemeMode = (state) => state.theme.mode;
export const selectSidebarOpen = (state) => state.theme.sidebarOpen;

export default themeSlice.reducer;
