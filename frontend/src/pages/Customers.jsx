import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, Skeleton, alpha, Divider, Stack, Grid,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  KeyboardArrowDown, KeyboardArrowUp, People as CustomerIcon, Close as CloseIcon,
} from '@mui/icons-material';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
} from '../api/customerApi';
import { useGetBillsByCustomerQuery, useUpdateBillPaymentMutation } from '../api/billingApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

// ========== Customer (Retail Store) Form Dialog ==========
const CustomerFormDialog = ({ open, onClose, customer, onSave }) => {
  const [form, setForm] = useState(customer || { shopName: '', ownerName: '', phone: '', email: '', address: '', gstNumber: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{customer ? 'Edit Retail Store' : 'Add Retail Store'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Shop Name *" name="shopName" value={form.shopName} onChange={handleChange} fullWidth size="small" />
          <TextField label="Owner Name *" name="ownerName" value={form.ownerName} onChange={handleChange} fullWidth size="small" />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} fullWidth size="small" />
          <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth size="small" />
          <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth size="small" multiline rows={2} />
          <TextField label="GST Number" name="gstNumber" value={form.gstNumber} onChange={handleChange} fullWidth size="small" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.shopName.trim() || !form.ownerName.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Bill Details Dialog ==========
const BillDetailsDialog = ({ open, onClose, bill }) => {
  if (!bill) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Bill Details: {bill.billNumber}
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Items List</Typography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bill.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="center">{item.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell align="right">{formatCurrency(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(bill.subtotal)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">GST Amount: <strong>{formatCurrency(bill.gstAmount)}</strong></Typography>
          {bill.discount > 0 && <Typography variant="body2" color="text.secondary">Discount: <strong>{formatCurrency(bill.discount)}</strong></Typography>}
          <Typography variant="subtitle1" fontWeight={800} color="primary.main">Final Total: {formatCurrency(bill.finalAmount)}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Customer Row with Bills ==========
const CustomerRow = ({ customer, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const { data: billsData } = useGetBillsByCustomerQuery(customer._id, { skip: !open });
  const [updateBillPayment] = useUpdateBillPaymentMutation();
  const bills = billsData?.data || [];

  const handlePaymentToggle = async (bill) => {
    const newStatus = bill.status === 'Paid' ? 'Pending' : 'Paid';
    try {
      await updateBillPayment({ id: bill._id, status: newStatus }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update payment status');
    }
  };

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{customer.shopName}</TableCell>
        <TableCell>{customer.ownerName}</TableCell>
        <TableCell>{customer.phone || '-'}</TableCell>
        <TableCell>{customer.address || '-'}</TableCell>
        <TableCell>{customer.gstNumber || '-'}</TableCell>
        <TableCell align="center">{customer.billCount || 0}</TableCell>
        <TableCell align="right">
          <Chip label={formatCurrency(customer.pendingCredit)} size="small" color={customer.pendingCredit > 0 ? 'warning' : 'success'} variant="outlined" sx={{ fontWeight: 700 }} />
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => onEdit(customer)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => onDelete(customer._id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
                Generated Bills ({bills.length})
              </Typography>
              {bills.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Bill#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Items</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total Amount</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Payment Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bills.map((b) => (
                      <TableRow key={b._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{b.billNumber}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{b.items?.length || 0}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(b.finalAmount)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={b.status}
                            size="small"
                            color={b.status === 'Paid' ? 'success' : 'warning'}
                            onClick={() => handlePaymentToggle(b)}
                            sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 70 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => setSelectedBill(b)}>View Details</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No bills generated yet for this retail store.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {selectedBill && (
        <BillDetailsDialog open={Boolean(selectedBill)} onClose={() => setSelectedBill(null)} bill={selectedBill} />
      )}
    </>
  );
};

// ========== Main Customers Page ==========
const Customers = () => {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const { data, isLoading } = useGetCustomersQuery(search);
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const customers = data?.data || [];

  const handleSave = async (form) => {
    try {
      if (editingCustomer) {
        await updateCustomer({ id: editingCustomer._id, ...form }).unwrap();
      } else {
        await createCustomer(form).unwrap();
      }
      setFormOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to save retail store');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteCustomer(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Retail Stores</Typography>
          <Typography variant="body2" color="text.secondary">Register and manage customer retail stores and track pending payments.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingCustomer(null); setFormOpen(true); }}>
          Add Retail Store
        </Button>
      </Box>

      <Card sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth size="small" placeholder="Search retail stores by shop name, owner, or phone..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
        />
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell sx={{ fontWeight: 700 }}>Shop Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Owner Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>GST</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Bills Count</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Pending Owed</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : customers.length > 0 ? (
                customers.map((c) => <CustomerRow key={c._id} customer={c} onEdit={handleEdit} onDelete={handleDelete} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No retail stores found. Click "Add Retail Store" to register one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {formOpen && (
        <CustomerFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCustomer(null); }}
          customer={editingCustomer}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default Customers;
