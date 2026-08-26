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
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
  PersonOutline,
} from '@mui/icons-material';
import { useLoginMutation } from '../api/authApi';
import { setCredentials } from '../features/auth/authSlice';

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.password) {
      setError('Please enter username and password');
      return;
    }

    try {
      const result = await login(formData).unwrap();

      if (result.success) {
        dispatch(setCredentials(result.data));
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.data?.message || 'Login failed. Please try again.');
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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          top: -100,
          right: -100,
          animation: 'pulse 4s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)', opacity: 0.5 },
            '50%': { transform: 'scale(1.2)', opacity: 0.8 },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.1) 0%, transparent 70%)',
          bottom: -50,
          left: -50,
          animation: 'pulse 5s ease-in-out infinite reverse',
        }}
      />

      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          mx: 2,
          position: 'relative',
          zIndex: 1,
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          backgroundColor: (theme) =>
            alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.7 : 0.9),
          backdropFilter: 'blur(24px)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo & Title */}
          <Box sx={{ textAlign: 'center', mb: 3.5 }}>
            <Box
              component="img"
              src="/app_logo.png"
              alt="TMW Logo"
              sx={{
                width: 80,
                height: 80,
                borderRadius: '18px',
                objectFit: 'contain',
                mx: 'auto',
                mb: 1.5,
                bgcolor: '#000',
                p: 0.5,
                boxShadow: '0 8px 30px rgba(14, 165, 233, 0.35)',
                border: '1px solid rgba(14, 165, 233, 0.35)',
              }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1E40AF, #0284C7)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                mb: 0.5,
                letterSpacing: 0.8,
              }}
            >
              TMW
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Wholesale Mobile Store Management
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth
              id="login-username"
              name="username"
              label="Username"
              value={formData.username}
              onChange={handleChange}
              margin="normal"
              autoFocus
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              id="login-password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Remember me
                </Typography>
              }
              sx={{ mt: 1, mb: 2 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading}
              id="login-submit-btn"
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Footer */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            © {new Date().getFullYear()} TMW. All rights reserved.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
