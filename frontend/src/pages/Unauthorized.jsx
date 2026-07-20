import React from 'react';
import { Box, Typography, Button, alpha } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '20px',
          background: (theme) => alpha(theme.palette.error.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <LockIcon sx={{ fontSize: 40, color: 'error.main' }} />
      </Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/')} id="back-home-btn">
        Back to Dashboard
      </Button>
    </Box>
  );
};

export default Unauthorized;
