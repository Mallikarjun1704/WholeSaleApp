import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { darkTheme, lightTheme } from './theme/theme';
import { selectThemeMode } from './features/theme/themeSlice';
import { selectIsAuthenticated } from './features/auth/authSlice';

// Layout
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import { useCheckSetupQuery } from './api/authApi';

// Pages
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Unauthorized from './pages/Unauthorized';

const App = () => {
  const themeMode = useSelector(selectThemeMode);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  const { data: setupData, isLoading: isSetupCheckLoading } = useCheckSetupQuery();

  if (isSetupCheckLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  const isSetupComplete = setupData?.data?.isSetupComplete;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Setup Wizard */}
          <Route
            path="/setup"
            element={
              isSetupComplete ? <Navigate to="/login" replace /> : <Setup />
            }
          />

          {/* Public Routes */}
          <Route
            path="/login"
            element={
              !isSetupComplete ? (
                <Navigate to="/setup" replace />
              ) : isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            }
          />

          {/* Protected Routes */}
          <Route
            element={
              !isSetupComplete ? (
                <Navigate to="/setup" replace />
              ) : (
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              )
            }
          >
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />

            {/* Unauthorized */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Inventory */}
            <Route path="/inventory" element={<Inventory />} />

            {/* Billing */}
            <Route path="/billing" element={<Billing />} />

            {/* Customers */}
            <Route path="/customers" element={<Customers />} />

            {/* Suppliers */}
            <Route path="/suppliers" element={<Suppliers />} />

            {/* Credits - placeholder for Phase 7 */}
            <Route path="/credits" element={<PlaceholderPage title="Credit Management" />} />

            {/* Reports - placeholder for Phase 8 */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['admin']}>
                  <PlaceholderPage title="Reports" />
                </ProtectedRoute>
              }
            />

            {/* Expenses - placeholder for Phase 8 */}
            <Route
              path="/expenses"
              element={
                <ProtectedRoute roles={['admin']}>
                  <PlaceholderPage title="Expenses" />
                </ProtectedRoute>
              }
            />

            {/* Settings - placeholder for Phase 9 */}
            <Route path="/settings/shop" element={<PlaceholderPage title="Shop Settings" />} />
            <Route path="/settings/users" element={<PlaceholderPage title="User Management" />} />
            <Route path="/settings/gst" element={<PlaceholderPage title="GST Settings" />} />
            <Route path="/settings/printer" element={<PlaceholderPage title="Printer Settings" />} />
            <Route path="/settings/invoice" element={<PlaceholderPage title="Invoice Settings" />} />
            <Route path="/settings/backup" element={<PlaceholderPage title="Backup & Restore" />} />
            <Route path="/settings/activity-logs" element={<PlaceholderPage title="Activity Logs" />} />

            {/* Profile */}
            <Route path="/profile" element={<PlaceholderPage title="My Profile" />} />
          </Route>

          {/* Catch all - redirect to dashboard or login */}
          <Route
            path="*"
            element={
              !isSetupComplete ? (
                <Navigate to="/setup" replace />
              ) : (
                <Navigate to={isAuthenticated ? '/' : '/login'} replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};


// Temporary placeholder for pages not yet built
const PlaceholderPage = ({ title }) => (
  <div style={{ padding: '20px' }}>
    <h2 style={{ marginBottom: '8px' }}>{title}</h2>
    <p style={{ opacity: 0.7 }}>This module will be implemented in an upcoming phase.</p>
  </div>
);

export default App;
