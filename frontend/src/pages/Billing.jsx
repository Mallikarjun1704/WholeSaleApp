import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Button, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, alpha, Divider, Grid, Stack, Tabs, Tab,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Delete as DeleteIcon,
  Receipt as BillIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useGetBillsQuery, useCreateBillMutation, useUpdateBillPaymentMutation } from '../api/billingApi';
import { useGetCustomersQuery } from '../api/customerApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

// ========== Bill Detail Viewer Dialog ==========
const BillDetailsDialog = ({ open, onClose, bill }) => {
  if (!bill) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Bill {bill.billNumber} Details
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Typography variant="body2"><strong>Shop Name:</strong> {bill.customer?.shopName || 'Unknown'}</Typography>
          <Typography variant="body2"><strong>Owner Name:</strong> {bill.customer?.ownerName || '-'}</Typography>
          <Typography variant="body2"><strong>Phone:</strong> {bill.customer?.phone || '-'}</Typography>
          <Typography variant="body2"><strong>Date:</strong> {new Date(bill.createdAt).toLocaleString('en-IN')}</Typography>
        </Stack>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Items</Typography>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Taxable</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>GST</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bill.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.name}</TableCell>
                <TableCell align="center">{item.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell align="right">{formatCurrency(item.taxableAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(item.gstAmount)} ({item.gstRate}%)</TableCell>
                <TableCell align="right">{formatCurrency(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

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

// ========== Create Bill View ==========
const CreateBillTab = ({ customers, products, onComplete }) => {
  const [createBill, { isLoading }] = useCreateBillMutation();
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: '' }]);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, sellingPrice: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;

    // Auto-fill price if product changes
    if (field === 'productId' && value) {
      const prod = products.find(p => p._id === value);
      if (prod) {
        updated[i].sellingPrice = prod.sellingPrice;
      }
    }

    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return sum + qty * price;
  }, 0);

  const gstAmount = items.reduce((sum, item) => {
    if (!item.productId) return sum;
    const prod = products.find(p => p._id === item.productId);
    const rate = prod?.gstRate || 18;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return sum + Math.round((qty * price * rate) / 100);
  }, 0);

  const finalAmount = subtotal + gstAmount - (Number(discount) || 0);

  const handleSubmit = async () => {
    const payload = {
      customerId,
      discount: Number(discount) || 0,
      paymentMethod,
      items: items.filter(i => i.productId && i.quantity).map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
      })),
    };
    try {
      await createBill(payload).unwrap();
      setCustomerId('');
      setDiscount(0);
      setItems([{ productId: '', quantity: 1, sellingPrice: '' }]);
      onComplete();
    } catch (err) {
      alert(err?.data?.message || 'Failed to generate bill');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Generate Wholesale Bill</Typography>
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <TextField select label="Retail Store (Customer) *" value={customerId} onChange={(e) => setCustomerId(e.target.value)} fullWidth size="small" SelectProps={{ native: true }}>
            <option value="">Select Retail Store...</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.shopName} ({c.ownerName})</option>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField select label="Payment Method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} fullWidth size="small" SelectProps={{ native: true }}>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="UPI">UPI</option>
            <option value="Credit">Credit</option>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={3}>
          <TextField label="Discount Amount ₹" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} fullWidth size="small" />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Items</Typography>
      {items.map((item, i) => {
        const selectedProd = products.find(p => p._id === item.productId);
        const availableStock = selectedProd ? selectedProd.stock : 0;

        return (
          <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
            <Grid item xs={5}>
              <TextField select label="Select Mobile Model *" value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} fullWidth size="small" SelectProps={{ native: true }}>
                <option value="">Select mobile...</option>
                {products.map(p => <option key={p._id} value={p._id} disabled={p.stock === 0}>{p.name} ({p.sku}) [Stock: {p.stock}]</option>)}
              </TextField>
            </Grid>
            <Grid item xs={2}>
              <TextField
                label="Qty" type="number" value={item.quantity}
                onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                fullWidth size="small"
                inputProps={{ min: 1, max: availableStock }}
                helperText={selectedProd ? `Max: ${availableStock}` : ''}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField label="Selling Price ₹ *" type="number" value={item.sellingPrice} onChange={(e) => updateItem(i, 'sellingPrice', e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={2}>
              {items.length > 1 && (
                <IconButton size="small" onClick={() => removeItem(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>
              )}
            </Grid>
          </Grid>
        );
      })}
      <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 3 }}>Add Mobile Item</Button>

      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">GST (18% Avg): <strong>{formatCurrency(gstAmount)}</strong></Typography>
        <Typography variant="subtitle1" fontWeight={800} color="primary.main">Grand Total: {formatCurrency(finalAmount)}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="large" onClick={handleSubmit} disabled={isLoading || !customerId || items.every(i => !i.productId)}>
          {isLoading ? 'Creating Bill...' : 'Create Sales Bill'}
        </Button>
      </Box>
    </Card>
  );
};

// ========== Main Billing Page ==========
const Billing = () => {
  const [tab, setTab] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const { data: billsData, isLoading: billsLoading } = useGetBillsQuery({ status: searchStatus });
  const { data: customersData } = useGetCustomersQuery('');
  const [updateBillPayment] = useUpdateBillPaymentMutation();

  const [productsList, setProductsList] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  // Get active products for dropdown
  useEffect(() => {
    fetch('/api/products?pageSize=500', {
      headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}')?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(d => setProductsList(d?.data?.products || []))
      .catch(() => {});
  }, [tab]);

  const bills = billsData?.data || [];
  const customers = customersData?.data || [];

  const handleMarkAsPaid = async (billId) => {
    try {
      await updateBillPayment({ id: billId, status: 'Paid' }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update payment status');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Billing</Typography>
          <Typography variant="body2" color="text.secondary">Generate sales bills for retail stores and track collections.</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BillIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(_, newTab) => setTab(newTab)}>
          <Tab label="Create Bill" sx={{ fontWeight: 700 }} />
          <Tab label="Bills History" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Box>

      {tab === 0 ? (
        <CreateBillTab customers={customers} products={productsList} onComplete={() => setTab(1)} />
      ) : (
        <Box>
          <Card sx={{ mb: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField select label="Filter by Payment Status" value={searchStatus} onChange={(e) => setSearchStatus(e.target.value)} size="small" sx={{ minWidth: 200 }} SelectProps={{ native: true }}>
              <option value="">All Bills</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </TextField>
          </Card>

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Bill Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Retail Shop</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Items Count</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                    ))
                  ) : bills.length > 0 ? (
                    bills.map((b) => (
                      <TableRow key={b._id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{b.billNumber}</TableCell>
                        <TableCell>{b.customer?.shopName || 'Unknown'}</TableCell>
                        <TableCell>{new Date(b.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell align="center">{b.items?.length || 0}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(b.finalAmount)}</TableCell>
                        <TableCell align="center">
                          <Chip label={b.status} size="small" color={b.status === 'Paid' ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => setSelectedBill(b)} sx={{ mr: 1 }}>View</Button>
                          {b.status === 'Pending' && (
                            <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="outlined" onClick={() => handleMarkAsPaid(b._id)}>
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No bills found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

      {selectedBill && (
        <BillDetailsDialog open={Boolean(selectedBill)} onClose={() => setSelectedBill(null)} bill={selectedBill} />
      )}
    </Box>
  );
};

export default Billing;
