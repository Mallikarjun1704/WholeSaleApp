import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Skeleton, Divider, Grid, Stack, Tabs, Tab, Alert, Paper,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Receipt as BillIcon, Close as CloseIcon, CheckCircle as CheckCircleIcon,
  PictureAsPdf as PdfIcon, Download as DownloadIcon, Visibility as ViewIcon,
  Print as PrintIcon, CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import { useGetBillsQuery, useCreateBillMutation, useUpdateBillPaymentMutation } from '../api/billingApi';
import { useGetCustomersQuery } from '../api/customerApi';
import { useGetInventoryQuery } from '../api/inventoryApi';
import { downloadBillPdf, openBillPdf } from '../utils/pdfUtils';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

// ========== Bill Detail Viewer Dialog ==========
const BillDetailsDialog = ({ open, onClose, bill }) => {
  if (!bill) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* TM Short Name Logo Emblem */}
          <Box sx={{
            width: 42, height: 42, borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F46E5, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: '1.25rem', letterSpacing: 1,
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}>
            TM
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} color="text.primary">TM Mobiles Bill</Typography>
            <Typography variant="caption" color="text.secondary">Bill #{bill.billNumber} • Invoice</Typography>
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
              <Typography variant="body2"><strong>Date:</strong> {new Date(bill.createdAt).toLocaleString('en-IN')}</Typography>
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
          {bill.discount > 0 && <Typography variant="body2" color="text.secondary">Discount: <strong>- {formatCurrency(bill.discount)}</strong></Typography>}
          <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: 'primary.main', color: '#fff', borderRadius: 2, mt: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>Grand Total: {formatCurrency(bill.finalAmount)}</Typography>
          </Paper>
        </Stack>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button startIcon={<ViewIcon />} variant="outlined" color="info" onClick={() => openBillPdf(bill._id)}>
            Open PDF
          </Button>
          <Button startIcon={<DownloadIcon />} variant="contained" color="primary" onClick={() => downloadBillPdf(bill._id, bill.billNumber)}>
            Download PDF Bill
          </Button>
        </Box>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Create Bill View ==========
const CreateBillTab = ({ customers, products, onComplete }) => {
  const [createBill, { isLoading }] = useCreateBillMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [items, setItems] = useState([{ productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
  const [createdBill, setCreatedBill] = useState(null);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, sellingPrice: '', gstRate: 0 }]);
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
    const rate = Number(item.gstRate) || 0;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.sellingPrice) || 0;
    return sum + Math.round((qty * price * rate) / 100);
  }, 0);

  const finalAmount = subtotal + gstAmount - (Number(discount) || 0);

  const handleSubmit = async () => {
    setErrorMsg('');
    const payload = {
      customerId,
      discount: Number(discount) || 0,
      paymentMethod,
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
      
      // Auto-trigger PDF download for instant experience
      if (newBill && newBill._id) {
        downloadBillPdf(newBill._id, newBill.billNumber);
      }

      setCustomerId('');
      setDiscount(0);
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
            <Grid item xs={4}>
              <TextField select label="Select Mobile Model *" value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} fullWidth size="small" SelectProps={{ native: true }}>
                <option value="">Select mobile...</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku}) [Stock: {p.stock}]{p.stock === 0 ? ' - (Out of Stock)' : ''}</option>)}
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 4, mb: 3 }}>
        <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
        <Typography variant="body2" color="text.secondary">GST Amount: <strong>{formatCurrency(gstAmount)}</strong></Typography>
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
              onClick={() => downloadBillPdf(createdBill._id, createdBill.billNumber)}
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
  const [tab, setTab] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const { data: billsData, isLoading: billsLoading } = useGetBillsQuery({ status: searchStatus });
  const { data: customersData } = useGetCustomersQuery('');
  const [updateBillPayment] = useUpdateBillPaymentMutation();

  const [selectedBill, setSelectedBill] = useState(null);
  const { data: inventoryData } = useGetInventoryQuery({});
  const productsList = inventoryData?.data || [];

  const bills = billsData?.data || [];
  const customers = customersData?.data || [];

  const handleMarkAsPaid = async (bill) => {
    const confirm1 = window.confirm(`Confirm payment collection for Bill #${bill.billNumber}? Amount: ₹${bill.finalAmount}`);
    if (!confirm1) return;
    const confirm2 = window.confirm(`Are you SURE you want to mark this bill as PAID? This will update cash and pending collection balances.`);
    if (!confirm2) return;
    try {
      await updateBillPayment({ id: bill._id, status: 'Paid' }).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to update payment status');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Billing</Typography>
          <Typography variant="body2" color="text.secondary">Generate sales bills with TM PDF branding and track collections.</Typography>
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
                          <Stack direction="row" spacing={1}>
                            <Button size="small" variant="outlined" onClick={() => setSelectedBill(b)}>View</Button>
                            <IconButton
                              size="small" color="primary" title="Download PDF Bill"
                              onClick={() => downloadBillPdf(b._id, b.billNumber)}
                            >
                              <PdfIcon fontSize="small" />
                            </IconButton>
                            {b.status === 'Pending' && (
                              <Button size="small" startIcon={<CheckCircleIcon />} color="success" variant="outlined" onClick={() => handleMarkAsPaid(b)}>
                                Mark Paid
                              </Button>
                            )}
                          </Stack>
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
