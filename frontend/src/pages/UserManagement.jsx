import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Switch, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, alpha, Grid, Stack, Alert, MenuItem, Select,
  FormControl, InputLabel, Paper
} from '@mui/material';
import {
  PersonAdd as AddUserIcon, People as UsersIcon, Close as CloseIcon,
  Shield as AdminIcon, Person as StaffIcon, Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useToggleUserAccessMutation
} from '../api/authApi';

const UserManagement = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    role: 'staff',
    isActive: true,
  });

  const { data, isLoading, refetch } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [toggleUserAccess] = useToggleUserAccessMutation();

  const users = data?.data || [];

  const handleOpen = () => {
    setForm({
      username: '',
      password: '',
      fullName: '',
      phone: '',
      email: '',
      role: 'staff',
      isActive: true,
    });
    setErrorMsg('');
    setSuccessMsg('');
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setErrorMsg('');
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim() || !form.fullName.trim()) {
      setErrorMsg('Username, Full Name, and Password are required.');
      return;
    }

    try {
      const res = await createUser(form).unwrap();
      if (res.success) {
        setSuccessMsg('User account created successfully!');
        handleClose();
      }
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to create user account.');
    }
  };

  const handleToggleAccess = async (user) => {
    try {
      const res = await toggleUserAccess(user._id).unwrap();
      if (res.success) {
        setSuccessMsg(res.message);
      }
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to update user access.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            User & Access Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage shopkeeper accounts, staff permissions, and active login access.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddUserIcon />}
            onClick={handleOpen}
            sx={{
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              fontWeight: 700,
            }}
          >
            Add New User
          </Button>
        </Stack>
      </Box>

      {/* Alerts */}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(79, 70, 229, 0.05))', borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <UsersIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Total Registered Users</Typography>
                <Typography variant="h5" fontWeight={800}>{users.length}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05))', borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <StaffIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Active Accounts</Typography>
                <Typography variant="h5" fontWeight={800}>{users.filter((u) => u.isActive).length}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))', borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <AdminIcon />
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">Administrators</Typography>
                <Typography variant="h5" fontWeight={800}>{users.filter((u) => u.role === 'admin').length}</Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* Main Table Card */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search users by name, username, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: { xs: '100%', sm: 360 } }}
            />
          </Box>

          {isLoading ? (
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Full Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone / Email</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Access Status</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No users found.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((u) => (
                      <TableRow key={u._id} hover>
                        <TableCell>
                          <Typography fontWeight={700}>{u.fullName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`@${u.username}`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={u.role === 'admin' ? <AdminIcon /> : <StaffIcon />}
                            label={u.role === 'admin' ? 'Administrator' : 'Staff / Shopkeeper'}
                            color={u.role === 'admin' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{u.phone || '-'}</Typography>
                          {u.email && (
                            <Typography variant="caption" color="text.secondary">
                              {u.email}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={u.isActive ? 'Active' : 'Disabled'}
                            color={u.isActive ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {u.isActive ? 'Revoke' : 'Grant'}
                            </Typography>
                            <Switch
                              checked={u.isActive}
                              onChange={() => handleToggleAccess(u)}
                              color="success"
                              size="small"
                            />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            Add New User / Staff Account
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ p: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                fullWidth
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    fullWidth
                    helperText="Used for login credentials"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    fullWidth
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone Number"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Role</InputLabel>
                    <Select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      label="Role"
                    >
                      <MenuItem value="staff">Staff / Shopkeeper</MenuItem>
                      <MenuItem value="admin">Administrator</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <TextField
                label="Email (Optional)"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isCreating}
              sx={{ fontWeight: 700 }}
            >
              {isCreating ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
