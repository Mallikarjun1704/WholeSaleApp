import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, Divider, Grid, Stack, Tabs, Tab, Alert, Paper, Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Receipt as BillIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon,
  PictureAsPdf as PdfIcon, Download as DownloadIcon, Visibility as ViewIcon,
  Print as PrintIcon, CheckCircleOutline as SuccessIcon, Edit as EditIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  useGetBillsQuery,
  useCreateBillMutation,
  useUpdateBillPaymentMutation,
  useUpdateBillMutation,
} from '../api/billingApi';
import { useGetCustomersQuery } from '../api/customerApi';
import { useGetInventoryQuery } from '../api/inventoryApi';
import { downloadBillPdf, openBillPdf } from '../utils/pdfUtils';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const formatDateDDMMYYYY = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// ========== Bill Detail Viewer Dialog ==========
const BillDetailsDialog = ({ open, onClose, bill }) => {
  if (!bill) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '1.4rem', letterSpacing: 1,
            boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
          }}>
            TM
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} sx={{ background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>TECH MART</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>Wholesale Bill #{bill.billNumber}</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>BILLED TO:</Typography>
              <Typography variant="subtitle1" fontWeight={800} color="primary.main">{bill.customer?.shopName || 'Unknown'}</Typography>
              <Typography variant="body2"><strong>Phone:</strong> {bill.customer?.phone || '-'}</Typography>
              <Typography variant="body2"><strong>GSTIN:</strong> {bill.customer?.gstNumber || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>INVOICE DETAILS:</Typography>
              <Typography variant="body2"><strong>Date:</strong> {formatDateDDMMYYYY(bill.billDate || bill.createdAt)}</Typography>
            </Grid>
          </Grid>
        </Paper>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Itemized List</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#1E293B' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>#</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Product / Mobile Model</TableCell>
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>Price Per Unit</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>GST</TableCell>
                <TableCell align="right" sx={{ color: '#fff', fontWeight: 700 }}>Total Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bill.items.map((item, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.sellingPrice)}</TableCell>
                  <TableCell align="right">{formatCurrency(item.gstAmount)} ({item.gstRate}%)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1} sx={{ alignItems: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(bill.subtotal)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">GST Amount: <strong>{formatCurrency(bill.gstAmount)}</strong></Typography>
          {bill.discount > 0 && <Typography variant="body2" color="text.secondary">Packing Charges: <strong>+ {formatCurrency(bill.discount)}</strong></Typography>}
          <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: 'primary.main', color: '#fff', borderRadius: 2, mt: 1, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>Grand Total: {formatCurrency(bill.finalAmount)}</Typography>
          </Paper>
          <Typography variant="body2" color="success.main">Amount Paid: <strong>{formatCurrency(bill.paidAmount || 0)}</strong></Typography>
          {Math.max(0, bill.finalAmount - (bill.paidAmount || 0)) > 0 && (
            <Typography variant="body2" color="error.main" fontWeight={700}>Remaining Balance to Pay: {formatCurrency(Math.max(0, bill.finalAmount - (bill.paidAmount || 0)))}</Typography>
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button startIcon={<ViewIcon />} variant="outlined" color="info" onClick={() => openBillPdf(bill._id)}>
            Open PDF
          </Button>
          <Button startIcon={<DownloadIcon />} variant="contained" color="primary" onClick={() => downloadBillPdf(bill._id, bill)}>
            Download PDF Bill
          </Button>
        </Box>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Admin Edit Bill Dialog ==========
const EditBillDialog = ({ open, onClose, bill, products = [], onSave, isLoading }) => {
  const [packingCharges, setPackingCharges] = useState(bill?.discount || 0);
  const [billDate, setBillDate] = useState(
    bill?.billDate ? new Date(bill.billDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (bill) {
      setPackingCharges(bill.discount || 0);
      setBillDate(
        bill.billDate ? new Date(bill.billDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setItems(
        (bill.items || []).map((item) => ({
          productId: item.product?._id || item.product,
          quantity: item.quantity || 1,
          sellingPrice: item.sellingPrice || 0,
          gstRate: item.gstRate || 0,
        }))
      );
    }
  }, [bill]);

  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

  const addItem = () =>
    setItems([...items, { productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;

    if (field === 'productId' && value) {
      const prod = products.find((p) => p._id === value);
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
    const rate = Number(item.gstRate) || 0;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return sum + Math.round((qty * price * rate) / 100);
  }, 0);

  const finalAmount = subtotal + gstAmount + (Number(packingCharges) || 0);

  const handleSubmit = () => {
    setErrorMsg('');
    const validItems = items.filter((i) => i.productId && Number(i.quantity) > 0 && Number(i.sellingPrice) >= 0);
    if (validItems.length === 0) {
      setErrorMsg('At least one valid product item is required in the bill');
      return;
    }

    onSave({
      discount: Number(packingCharges) || 0,
      billDate,
      items: validItems.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
        gstRate: Number(i.gstRate) || 0,
      })),
    });
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Bill: #{bill.billNumber}</DialogTitle>
      <DialogContent dividers>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Bill Date *"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Packing Charges ₹"
                type="number"
                value={packingCharges}
                onChange={(e) => setPackingCharges(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Bill Product Items</Typography>
          </Box>

          {items.map((item, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid item xs={4}>
                <Autocomplete
                  options={sortedProducts}
                  getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.sku})`}
                  value={sortedProducts.find((p) => p._id === item.productId) || null}
                  onChange={(event, newValue) => {
                    updateItem(i, 'productId', newValue ? newValue._id : '');
                  }}
                  isOptionEqualToValue={(option, val) => option._id === (val?._id || val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Product *" size="small" fullWidth placeholder="Search product..." />
                  )}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField label="Qty *" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={2.5}>
                <TextField label="Selling Price ₹ *" type="number" value={item.sellingPrice} onChange={(e) => updateItem(i, 'sellingPrice', e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={2.5}>
                <TextField label="GST %" type="number" value={item.gstRate} onChange={(e) => updateItem(i, 'gstRate', e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={1}>
                {items.length > 1 && (
                  <IconButton size="small" onClick={() => removeItem(i)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}

          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ alignSelf: 'flex-start' }}>
            Add Another Product
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Subtotal: <strong>{formatCurrency(subtotal)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              GST: <strong>{formatCurrency(gstAmount)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Packing Charges: <strong>{formatCurrency(Number(packingCharges) || 0)}</strong>
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
              Total: {formatCurrency(finalAmount)}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || items.every((i) => !i.productId)}
        >
          {isLoading ? 'Saving...' : 'Update Bill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Record Partial / Full Payment Dialog ==========
const RecordPaymentDialog = ({ open, onClose, billNumber, totalAmount, paidAmount, onSave, isLoading }) => {
  const remaining = Math.max(0, (totalAmount || 0) - (paidAmount || 0));
  const [payAmount, setPayAmount] = useState(remaining);

  React.useEffect(() => {
    setPayAmount(remaining);
  }, [open, remaining]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Record Payment: #{billNumber}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1.5 }}>
            <Typography variant="body2" color="text.secondary">Total Amount: <strong>{formatCurrency(totalAmount)}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Paid So Far: <strong>{formatCurrency(paidAmount)}</strong></Typography>
            <Typography variant="subtitle2" color="error.main" fontWeight={800} sx={{ mt: 0.5 }}>
              Remaining to Pay: {formatCurrency(remaining)}
            </Typography>
          </Box>
          <TextField
            label="Payment Amount ₹ *"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            fullWidth
            size="small"
            inputProps={{ min: 1, max: remaining }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onSave(Number(payAmount))}
          disabled={isLoading || !payAmount || Number(payAmount) <= 0}
        >
          {isLoading ? 'Saving...' : 'Submit Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Create Bill View ==========
const CreateBillTab = ({ customers, products, onComplete }) => {
  const [createBill, { isLoading }] = useCreateBillMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [packingCharges, setPackingCharges] = useState(0);
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
  const [createdBill, setCreatedBill] = useState(null);

  const sortedCustomers = React.useMemo(() => {
    return [...customers].sort((a, b) => (a.shopName || a.name || '').localeCompare(b.shopName || b.name || ''));
  }, [customers]);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;

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
    const rate = Number(item.gstRate) || 0;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return sum + Math.round((qty * price * rate) / 100);
  }, 0);

  const finalAmount = subtotal + gstAmount + (Number(packingCharges) || 0);

  const handleSubmit = async () => {
    setErrorMsg('');
    const payload = {
      customerId,
      billDate: saleDate,
      paidAmount: 0,
      discount: Number(packingCharges) || 0,
      paymentMethod: 'Credit',
      items: items.filter(i => i.productId && i.quantity).map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        sellingPrice: Number(i.sellingPrice),
        gstRate: Number(i.gstRate) || 0,
      })),
    };
    try {
      const res = await createBill(payload).unwrap();
      const newBill = res.data;
      setCreatedBill(newBill);
      
      if (newBill && newBill._id) {
        downloadBillPdf(newBill._id, newBill);
      }

      setCustomerId('');
      setSaleDate(new Date().toISOString().slice(0, 10));
      setPackingCharges(0);
      setItems([{ productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to generate bill');
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Generate Wholesale Bill</Typography>
      {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={5}>
          <Autocomplete
            options={sortedCustomers}
            getOptionLabel={(option) => typeof option === 'string' ? option : `${option.shopName || option.name} (${option.ownerName || option.phone || ''})`}
            value={sortedCustomers.find(c => c._id === customerId) || null}
            onChange={(_, newValue) => setCustomerId(newValue ? newValue._id : '')}
            isOptionEqualToValue={(option, val) => option._id === (val?._id || val)}
            renderInput={(params) => (
              <TextField {...params} label="Retail Store (Customer) *" size="small" fullWidth placeholder="Type to filter store alphabetically..." />
            )}
          />
        </Grid>
        <Grid item xs={12} sm={3.5}>
          <TextField label="Sale Date *" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={3.5}>
          <TextField label="Packing Charges ₹" type="number" value={packingCharges} onChange={(e) => setPackingCharges(e.target.value)} fullWidth size="small" />
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Items</Typography>
      {items.map((item, i) => {
        const selectedProd = products.find(p => p._id === item.productId);
        const availableStock = selectedProd ? selectedProd.stock : 0;

        return (
          <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
            <Grid item xs={4}>
              <Autocomplete
                  options={products.filter(p => p.stock > 0).sort((a, b) => (a.name || '').localeCompare(b.name || ''))}
                  getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.sku}) [Stock: ${option.stock}]`}
                  value={products.find(p => p._id === item.productId) || null}
                  onChange={(event, newValue) => {
                    updateItem(i, 'productId', newValue ? newValue._id : '');
                  }}
                  isOptionEqualToValue={(option, val) => option._id === (val?._id || val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Mobile Model *" size="small" fullWidth placeholder="Type to search mobile..." />
                  )}
                  renderOption={(props, option) => (
                    <li {...props} key={option._id}>
                      {option.name} ({option.sku}) [Stock: {option.stock}]
                    </li>
                  )}
                />
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
            <Grid item xs={2.5}>
              <TextField label="Price Per Unit ₹ *" type="number" value={item.sellingPrice} onChange={(e) => updateItem(i, 'sellingPrice', e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={1.5}>
              <TextField
                label="GST %" type="number" value={item.gstRate}
                onChange={(e) => updateItem(i, 'gstRate', e.target.value)}
                fullWidth size="small"
                inputProps={{ min: 0, max: 100, step: 1 }}
              />
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">Total Quantity: <strong>{items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} Units</strong></Typography>
        <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">GST Amount: <strong>{formatCurrency(gstAmount)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">Packing Charges: <strong>+ {formatCurrency(Number(packingCharges) || 0)}</strong></Typography>
        <Typography variant="subtitle1" fontWeight={800} color="primary.main">Grand Total: {formatCurrency(finalAmount)}</Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" size="large" onClick={handleSubmit} disabled={isLoading || !customerId || items.every(i => !i.productId)}>
          {isLoading ? 'Generating Bill & PDF...' : 'Create Sales Bill & Generate PDF'}
        </Button>
      </Box>

      {/* Bill Creation Success & PDF Dialog */}
      {createdBill && (
        <Dialog open={Boolean(createdBill)} onClose={() => setCreatedBill(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <Box sx={{
              width: 54, height: 54, borderRadius: '50%', bgcolor: 'success.light',
              color: 'success.main', mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1
            }}>
              <SuccessIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" fontWeight={800}>Bill Generated Successfully!</Typography>
            <Typography variant="body2" color="text.secondary">PDF Bill created with TM design</Typography>
          </DialogTitle>

          <DialogContent textalign="center" sx={{ textAlign: 'center', pb: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ px: 1, py: 0.2, bgcolor: '#4F46E5', color: '#fff', fontWeight: 900, borderRadius: 1, fontSize: '0.8rem' }}>
                  TM
                </Box>
                <Typography variant="subtitle1" fontWeight={800}>{createdBill.billNumber}</Typography>
              </Box>
              <Typography variant="body2"><strong>Shop:</strong> {createdBill.customer?.shopName || 'Retail Customer'}</Typography>
              <Typography variant="subtitle2" color="primary.main" fontWeight={800} sx={{ mt: 0.5 }}>
                Total: {formatCurrency(createdBill.finalAmount)}
              </Typography>
            </Paper>
            <Alert severity="info" icon={<PdfIcon />} sx={{ textalign: 'left', fontSize: '0.8rem' }}>
              Your PDF bill download has been initiated automatically.
            </Alert>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, flexDirection: 'column', gap: 1 }}>
            <Button
              fullWidth variant="contained" color="primary" startIcon={<DownloadIcon />}
              onClick={() => downloadBillPdf(createdBill._id, createdBill)}
            >
              Download PDF Bill Again
            </Button>
            <Button
              fullWidth variant="outlined" color="info" startIcon={<ViewIcon />}
              onClick={() => openBillPdf(createdBill._id)}
            >
              View PDF in Browser
            </Button>
            <Button
              fullWidth variant="text" color="inherit"
              onClick={() => {
                setCreatedBill(null);
                onComplete();
              }}
            >
              Go to Bills History
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
};

// ========== Main Billing Page ==========
const Billing = () => {
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === 'admin';

  const [tab, setTab] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const { data: billsData, isLoading: billsLoading } = useGetBillsQuery({ status: searchStatus });
  const { data: customersData } = useGetCustomersQuery('');
  const [updateBillPayment] = useUpdateBillPaymentMutation();
  const [updateBill, { isLoading: isUpdatingBill }] = useUpdateBillMutation();

  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null);
  const [editingBill, setEditingBill] = useState(null);

  const { data: inventoryData } = useGetInventoryQuery({});
  const productsList = inventoryData?.data || [];

  const bills = billsData?.data || [];
  const customers = customersData?.data || [];

  const handleRecordPayment = async (amount) => {
    if (!paymentBill) return;
    try {
      await updateBillPayment({ id: paymentBill._id, amount }).unwrap();
      setPaymentBill(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to update payment status');
    }
  };

  const handleSaveEditBill = async (data) => {
    if (!editingBill) return;
    try {
      await updateBill({ id: editingBill._id, ...data }).unwrap();
      setEditingBill(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to update bill');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 54, height: 54, borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '1.5rem', letterSpacing: 1.5,
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.35)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
          }}>
            TM
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ background: 'linear-gradient(135deg, #6366F1, #0EA5E9)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              TECH MART Billing
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate sales bills with TM branding, total quantities, and PDF export.
            </Typography>
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
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Items</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Total Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Paid</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Remaining</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                    ))
                  ) : bills.length > 0 ? (
                    bills.map((b) => {
                      const totalQty = b.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                      const paid = b.paidAmount || 0;
                      const remaining = Math.max(0, b.finalAmount - paid);
                      const isPaid = b.status === 'Paid';
                      const isPartial = b.status === 'Partially Paid';
                      return (
                        <TableRow key={b._id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{b.billNumber}</TableCell>
                          <TableCell>{b.customer?.shopName || 'Unknown'}</TableCell>
                          <TableCell>{formatDateDDMMYYYY(b.billDate || b.createdAt)}</TableCell>
                          <TableCell align="center">{b.items?.length || 0}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>{totalQty}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(b.finalAmount)}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.main' }}>{formatCurrency(paid)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: remaining > 0 ? 'error.main' : 'text.secondary' }}>
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={b.status}
                              size="small"
                              color={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
                              onClick={() => !isPaid && setPaymentBill(b)}
                              sx={{ fontWeight: 700, cursor: isPaid ? 'default' : 'pointer', minWidth: 75 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" variant="outlined" onClick={() => setSelectedBill(b)}>View</Button>
                              <IconButton
                                size="small" color="primary" title="Download PDF Bill"
                                onClick={() => downloadBillPdf(b._id, b)}
                              >
                                <PdfIcon fontSize="small" />
                              </IconButton>
                              {!isPaid && isAdmin && (
                                <IconButton
                                  size="small"
                                  color="warning"
                                  title="Edit Bill"
                                  onClick={() => setEditingBill(b)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
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

      {paymentBill && (
        <RecordPaymentDialog
          open={Boolean(paymentBill)}
          onClose={() => setPaymentBill(null)}
          billNumber={paymentBill.billNumber}
          totalAmount={paymentBill.finalAmount}
          paidAmount={paymentBill.paidAmount}
          onSave={handleRecordPayment}
          isLoading={false}
        />
      )}

      {editingBill && (
        <EditBillDialog
          open={Boolean(editingBill)}
          onClose={() => setEditingBill(null)}
          bill={editingBill}
          products={productsList}
          onSave={handleSaveEditBill}
          isLoading={isUpdatingBill}
        />
      )}
    </Box>
  );
};

export default Billing;
