import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, alpha, Grid, Stack, Alert,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, AccountBalanceWallet as ExpenseIcon,
  Close as CloseIcon, FilterList as FilterIcon,
} from '@mui/icons-material';
import { useGetExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation } from '../api/expenseApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const EXPENSE_CATEGORIES = ['Rent', 'Salaries', 'Utilities', 'Travel', 'Tea & Snacks', 'Maintenance', 'Other'];

const Expenses = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    category: 'Rent',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const { data, isLoading } = useGetExpensesQuery(selectedCategory ? { category: selectedCategory } : {});
  const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const expenses = data?.data?.expenses || [];
  const categorySummaries = data?.data?.categorySummaries || [];
  const totalExpense = data?.data?.totalExpense || 0;

  const handleOpen = () => {
    setForm({
      title: '',
      category: 'Rent',
      amount: '',
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
    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0) {
      setErrorMsg('Please enter a valid expense title and amount.');
      return;
    }
    try {
      await createExpense({
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        notes: form.notes,
      }).unwrap();
      handleClose();
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to record expense.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await deleteExpense(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete expense');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Store Expenses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track day-to-day operational store expenses (Rent, Salaries, Tea/Snacks, Travel). Deducts from Amount in Hand.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
          Add Store Expense
        </Button>
      </Box>

      {/* Expense Summary Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: alpha('#EF4444', 0.08), border: `1px solid ${alpha('#EF4444', 0.2)}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>
                    TOTAL STORE EXPENSES
                  </Typography>
                  <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
                    {formatCurrency(totalExpense)}
                  </Typography>
                </Box>
                <ExpenseIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {categorySummaries.map((cat, idx) => (
          <Grid item xs={6} sm={4} md={2.25} key={idx}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {cat._id}
                </Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                  {formatCurrency(cat.totalAmount)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {cat.count} {cat.count === 1 ? 'entry' : 'entries'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters & Table */}
      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FilterIcon color="action" />
          <Typography variant="body2" fontWeight={600}>Filter Category:</Typography>
          <Button
            size="small"
            variant={selectedCategory === '' ? 'contained' : 'outlined'}
            onClick={() => setSelectedCategory('')}
          >
            All
          </Button>
          {EXPENSE_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="small"
              variant={selectedCategory === cat ? 'contained' : 'outlined'}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </Box>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Expense Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
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
              ) : expenses.length > 0 ? (
                expenses.map((exp) => (
                  <TableRow key={exp._id} hover>
                    <TableCell>{new Date(exp.date || exp.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{exp.title}</TableCell>
                    <TableCell>
                      <Chip label={exp.category} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {formatCurrency(exp.amount)}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {exp.notes || '-'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>
                      {exp.createdBy?.fullName || 'System'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => handleDelete(exp._id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No store expenses recorded. Click "Add Store Expense" to log expenses.
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
          Record Store Expense
          <IconButton onClick={handleClose}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {errorMsg && <Alert severity="error">{errorMsg}</Alert>}
            <TextField
              label="Expense Title *"
              placeholder="e.g. Shop Rent / Tea & Snacks"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              size="small"
            />
            <TextField
              select
              label="Category *"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              fullWidth
              size="small"
              SelectProps={{ native: true }}
            >
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
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
            {isCreating ? 'Saving...' : 'Save Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
