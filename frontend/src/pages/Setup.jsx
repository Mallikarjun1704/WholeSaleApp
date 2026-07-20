import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Grid,
  alpha,
  Paper,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Store as StoreIcon,
  CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import { useSetupMutation } from '../api/authApi';
import { setCredentials } from '../features/auth/authSlice';

const steps = ['Administrator Credentials', 'Shop Details', 'Confirmation'];

const Setup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [setup, { isLoading }] = useSetupMutation();

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');

  // Form State
  const [adminData, setAdminData] = useState({
    username: 'admin',
    password: '',
    confirmPassword: '',
    fullName: '',
    email: '',
    phone: '',
  });

  const [shopData, setShopData] = useState({
    storeName: 'TECH MART',
    gstNumber: '',
    phone: '',
    email: '',
    website: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  const handleAdminChange = (e) => {
    setAdminData({ ...adminData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleShopChange = (e) => {
    setShopData({ ...shopData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleNext = () => {
    if (activeStep === 0) {
      if (!adminData.username || !adminData.password || !adminData.fullName) {
        setError('Username, Password, and Full Name are required');
        return;
      }
      if (adminData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      if (adminData.password !== adminData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else if (activeStep === 1) {
      if (!shopData.storeName) {
        setError('Store Name is required');
        return;
      }
    }
    setError('');
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        username: adminData.username,
        password: adminData.password,
        fullName: adminData.fullName,
        phone: adminData.phone,
        email: adminData.email,
        shopDetails: {
          storeName: shopData.storeName,
          gstNumber: shopData.gstNumber,
          phone: shopData.phone,
          email: shopData.email,
          website: shopData.website,
          address: {
            street: shopData.street,
            city: shopData.city,
            state: shopData.state,
            pincode: shopData.pincode,
          },
        },
      };

      const result = await setup(payload).unwrap();
      if (result.success) {
        dispatch(setCredentials(result.data));
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.data?.message || 'Setup failed. Please try again.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)'
            : 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #EEF2FF 100%)',
        py: 4,
        px: 2,
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 700,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          backgroundColor: (theme) =>
            alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.75 : 0.95),
          backdropFilter: 'blur(24px)',
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              System Setup Wizard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Initialize TECH MART and configure your store settings
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Step Contents */}
          <Box sx={{ mt: 2, mb: 4 }}>
            {activeStep === 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <AdminIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Create Administrator Account
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={adminData.username}
                      onChange={handleAdminChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      name="fullName"
                      value={adminData.fullName}
                      onChange={handleAdminChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Password"
                      name="password"
                      type="password"
                      value={adminData.password}
                      onChange={handleAdminChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      name="confirmPassword"
                      type="password"
                      value={adminData.confirmPassword}
                      onChange={handleAdminChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      name="email"
                      type="email"
                      value={adminData.email}
                      onChange={handleAdminChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      name="phone"
                      value={adminData.phone}
                      onChange={handleAdminChange}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {activeStep === 1 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <StoreIcon color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    Store Details & Info
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Store Name"
                      name="storeName"
                      value={shopData.storeName}
                      onChange={handleShopChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="GST Number"
                      name="gstNumber"
                      value={shopData.gstNumber}
                      onChange={handleShopChange}
                      placeholder="e.g. 29AAAAA0000A1Z5"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Store Phone"
                      name="phone"
                      value={shopData.phone}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Store Email"
                      name="email"
                      type="email"
                      value={shopData.email}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Website URL"
                      name="website"
                      value={shopData.website}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      name="street"
                      value={shopData.street}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="City"
                      name="city"
                      value={shopData.city}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="State"
                      name="state"
                      value={shopData.state}
                      onChange={handleShopChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Pincode"
                      name="pincode"
                      value={shopData.pincode}
                      onChange={handleShopChange}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {activeStep === 2 && (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <SuccessIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  Ready to Initialize
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                  Please confirm the administrator details and shop settings. Clicking "Complete Setup" will create the database and set up your system.
                </Typography>

                <Grid container spacing={3} justifyContent="center">
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'left', height: '100%' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
                        Administrator
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Name:</strong> {adminData.fullName}</Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Username:</strong> {adminData.username}</Typography>
                      <Typography variant="body2"><strong>Email:</strong> {adminData.email || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'left', height: '100%' }}>
                      <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom>
                        Shop Info
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}><strong>Store:</strong> {shopData.storeName}</Typography>
                      <Typography variant="body2" sx={{ mb: 0.5 }}><strong>GSTIN:</strong> {shopData.gstNumber || 'N/A'}</Typography>
                      <Typography variant="body2"><strong>Phone:</strong> {shopData.phone || 'N/A'}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0 || isLoading}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  sx={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)',
                    },
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={24} sx={{ color: '#fff' }} />
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Setup;
