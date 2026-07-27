import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, alpha, Grid, Stack, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, AccountBalance as CapitalIcon,
  TrendingUp as InvestmentIcon, TrendingDown as WithdrawalIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useGetInvestmentsQuery, useCreateInvestmentMutation, useDeleteInvestmentMutation } from '../api/investmentApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const Investments = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    partnerName: '',
    amount: '',
    type: 'Investment',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const { data, isLoading } = useGetInvestmentsQuery();
  const [createInvestment, { isLoading: isCreating }] = useCreateInvestmentMutation();
  const [deleteInvestment] = useDeleteInvestmentMutation();

  const investments = data?.data?.investments || [];
  const partnerSummaries = data?.data?.partnerSummaries || [];
  const totalCapital = data?.data?.totalCapital || 0;

  const handleOpen = () => {
    setForm({
      partnerName: '',
      amount: '',
      type: 'Investment',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setErrorMsg('');
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (!form.partnerName.trim() || !form.amount || Number(form.amount) <= 0) {
      setErrorMsg('Please enter a valid partner name and amount.');
      return;
    }
    try {
      await createInvestment({
        partnerName: form.partnerName,
        amount: Number(form.amount),
        type: form.type,
        date: form.date,
        notes: form.notes,
      }).unwrap();
      handleClose();
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to record investment entry.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteInvestment(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete entry');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Partner Investments & Capital
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage partner capital contributions and withdrawals. Initial partner investment feeds into Amount in Hand.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Add Investment / Withdrawal
        </Button>
      </Box>

      {/* Capital Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ bgcolor: alpha('#6366F1', 0.08), border: `1px solid ${alpha('#6366F1', 0.2)}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    TOTAL NET BUSINESS CAPITAL
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>
                    {formatCurrency(totalCapital)}
                  </Typography>
                </Box>
                <CapitalIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {partnerSummaries.map((p, idx) => (
          <Grid item xs={12} sm={6} md={4} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {p.partnerName.toUpperCase()}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
                  {formatCurrency(p.netCapital)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Invested: {formatCurrency(p.totalInvested)} | Withdrawn: {formatCurrency(p.totalWithdrawn)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* History Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Partner Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Recorded By</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : investments.length > 0 ? (
                investments.map((inv) => (
                  <TableRow key={inv._id} hover>
                    <TableCell>{new Date(inv.date || inv.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{inv.partnerName}</TableCell>
                    <TableCell>
                      <Chip
                        label={inv.type}
                        size="small"
                        color={inv.type === 'Investment' ? 'success' : 'warning'}
                        icon={inv.type === 'Investment' ? <InvestmentIcon fontSize="small" /> : <WithdrawalIcon fontSize="small" />}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      {formatCurrency(inv.amount)}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {inv.notes || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      {inv.createdBy?.fullName || 'System'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleDelete(inv._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No investments logged yet. Click "Add Investment / Withdrawal" to add initial partner capital.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Record Partner Capital
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            <TextField
              label="Partner Name *"
              placeholder="e.g. Partner 1 or Mallikarjun"
              value={form.partnerName}
              onChange={(e) => setForm({ ...form, partnerName: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              select
              label="Transaction Type *"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              <option value="Investment">Investment (Capital Add)</option>
              <option value="Withdrawal">Withdrawal (Capital Out)</option>
            </TextField>
            <TextField
              label="Amount ₹ *"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes / Remarks"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Saving...' : 'Save Entry'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Investments;
