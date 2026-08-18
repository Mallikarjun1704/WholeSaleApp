import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, Skeleton, alpha, Divider, Stack, Grid, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  KeyboardArrowDown, KeyboardArrowUp, People as CustomerIcon, Close as CloseIcon,
  PictureAsPdf as PdfIcon, Download as DownloadIcon, Visibility as ViewIcon,
  History as HistoryIcon, Payment as PaymentIcon, Receipt as ReceiptIcon,
} from '@mui/icons-material';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useRecordCustomerPaymentMutation,
} from '../api/customerApi';
import { useGetBillsByCustomerQuery, useUpdateBillPaymentMutation } from '../api/billingApi';
import { downloadBillPdf, openBillPdf } from '../utils/pdfUtils';

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

// ========== Bill Detail Viewer Dialog ==========
const BillDetailsDialog = ({ open, onClose, bill }) => {
  if (!bill) return null;

  const customerOutstanding = typeof bill.outstandingAmount === 'number'
    ? bill.outstandingAmount
    : (Number(bill.customer?.pendingCredit) || 0);
  const subtotal = Number(bill.subtotal) || 0;
  const gstAmount = Number(bill.gstAmount) || 0;
  const packingCharges = Number(bill.discount) || 0;
  const grandTotal = subtotal + gstAmount + packingCharges + customerOutstanding;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            px: 1.2, py: 0.4, borderRadius: '8px',
            bgcolor: 'primary.main', color: '#fff', fontWeight: 900, fontSize: '1rem',
            letterSpacing: 1
          }}>
            TM
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>Bill Details: #{bill.billNumber}</Typography>
            <Typography variant="caption" color="text.secondary">Date: {new Date(bill.billDate || bill.createdAt).toLocaleDateString('en-IN')}</Typography>
          </Box>
        </Box>
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
          <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">GST Amount: <strong>{formatCurrency(gstAmount)}</strong></Typography>
          {packingCharges > 0 && <Typography variant="body2" color="text.secondary">Packing Charges: <strong>+ {formatCurrency(packingCharges)}</strong></Typography>}
          <Typography variant="body2" color="error.main">Outstanding Amount: <strong>{formatCurrency(customerOutstanding)}</strong></Typography>
          <Paper elevation={0} sx={{ p: 1.5, px: 3, bgcolor: 'primary.main', color: '#fff', borderRadius: 2, mt: 1, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>Grand Total: {formatCurrency(grandTotal)}</Typography>
          </Paper>
          <Typography variant="body2" color="success.main">Amount Paid: <strong>{formatCurrency(bill.paidAmount || 0)}</strong></Typography>
          {Math.max(0, bill.finalAmount - (bill.paidAmount || 0)) > 0 && (
            <Typography variant="body2" color="error.main" fontWeight={700}>Remaining to Pay: {formatCurrency(Math.max(0, bill.finalAmount - (bill.paidAmount || 0)))}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<ViewIcon />} variant="outlined" color="info" onClick={() => openBillPdf(bill._id)}>
            Open PDF
          </Button>
          <Button size="small" startIcon={<DownloadIcon />} variant="contained" color="primary" onClick={() => downloadBillPdf(bill._id, bill)}>
            Download PDF
          </Button>
        </Box>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Record Partial / Full Payment Dialog for Single Bill ==========
const RecordPaymentDialog = ({ open, onClose, bill, onSave, isLoading }) => {
  const [payAmount, setPayAmount] = useState('');

  React.useEffect(() => {
    if (bill) {
      const total = bill.finalAmount || 0;
      const paid = bill.paidAmount || 0;
      const rem = Math.max(0, total - paid);
      setPayAmount(rem > 0 ? rem : total);
    }
  }, [open, bill]);

  if (!bill) return null;

  const totalAmount = bill.finalAmount || 0;
  const paidAmount = bill.paidAmount || 0;
  const status = bill.status || 'Pending';
  const isPaid = status === 'Paid';
  const remaining = Math.max(0, totalAmount - paidAmount);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Payment Status: #{bill.billNumber}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">Current Status:</Typography>
              <Chip
                label={status}
                size="small"
                color={isPaid ? 'success' : status === 'Partially Paid' ? 'warning' : 'error'}
                sx={{ fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">Total Amount: <strong>{formatCurrency(totalAmount)}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Paid So Far: <strong>{formatCurrency(paidAmount)}</strong></Typography>
            <Typography variant="subtitle2" color={remaining > 0 ? 'error.main' : 'success.main'} fontWeight={800} sx={{ mt: 0.5 }}>
              {remaining > 0 ? `Remaining to Pay: ${formatCurrency(remaining)}` : 'Bill is fully paid'}
            </Typography>
          </Box>

          {isPaid ? (
            <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
              This bill is currently marked as <strong>Paid</strong>. You can revert it to <strong>Unpaid (Pending)</strong> if needed.
            </Alert>
          ) : (
            <TextField
              label="Payment Amount ₹ *"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              fullWidth
              size="small"
              inputProps={{ min: 1, max: remaining }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {(isPaid || paidAmount > 0) && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onSave({ status: 'Pending', amount: 0 })}
              disabled={isLoading}
            >
              Revert to Unpaid
            </Button>
          )}
          {!isPaid && (
            <Button
              variant="contained"
              onClick={() => onSave({ amount: Number(payAmount) })}
              disabled={isLoading || !payAmount || Number(payAmount) <= 0}
            >
              {isLoading ? 'Saving...' : 'Submit Payment'}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

// ========== Customer Bulk Payment Dialog (FIFO Distribution) ==========
const CustomerBulkPaymentDialog = ({ open, onClose, customer }) => {
  const { data: billsData, isLoading: isBillsLoading } = useGetBillsByCustomerQuery(customer._id, { skip: !open });
  const [recordPayment, { isLoading: isSubmitting }] = useRecordCustomerPaymentMutation();

  const bills = billsData?.data || [];
  // Filter unpaid/partially paid bills sorted by billDate/createdAt ASC (FIFO)
  const unpaidBills = bills
    .filter((b) => b.status !== 'Cancelled' && (b.finalAmount - (b.paidAmount || 0)) > 0)
    .sort((a, b) => new Date(a.billDate || a.createdAt) - new Date(b.billDate || b.createdAt));

  const totalOwed = unpaidBills.reduce((sum, b) => sum + Math.max(0, b.finalAmount - (b.paidAmount || 0)), 0);

  const [payAmount, setPayAmount] = useState(totalOwed);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  React.useEffect(() => {
    setPayAmount(totalOwed);
  }, [open, totalOwed]);

  // Calculate live allocation across bills in FIFO order
  let remainingInput = Number(payAmount) || 0;
  const allocations = unpaidBills.map((b) => {
    const owed = Math.max(0, b.finalAmount - (b.paidAmount || 0));
    const allocated = Math.min(owed, Math.max(0, remainingInput));
    remainingInput -= allocated;
    const newPaid = (b.paidAmount || 0) + allocated;
    const newStatus = newPaid >= b.finalAmount ? 'Paid' : newPaid > 0 ? 'Partially Paid' : b.status;
    return {
      ...b,
      owed,
      allocated,
      newPaid,
      newStatus,
    };
  });

  const handleSubmit = async () => {
    if (!payAmount || Number(payAmount) <= 0) return;
    try {
      await recordPayment({
        id: customer._id,
        amount: Number(payAmount),
        paymentMethod,
        paymentDate,
        note,
      }).unwrap();
      onClose();
    } catch (err) {
      alert(err?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Record Payment - {customer.shopName}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box sx={{ p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: '1px solid', borderColor: 'primary.light' }}>
                <Typography variant="body2" color="text.secondary">Total Outstanding Owed</Typography>
                <Typography variant="h5" fontWeight={800} color="error.main">{formatCurrency(totalOwed)}</Typography>
                <Typography variant="caption" color="text.secondary">{unpaidBills.length} unpaid bill(s) pending</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Payment Amount ₹ *"
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ min: 1, max: totalOwed }}
                sx={{ mb: 1.5 }}
              />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Method</InputLabel>
                    <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="UPI">UPI</MenuItem>
                      <MenuItem value="Card">Card</MenuItem>
                      <MenuItem value="Net Banking">Net Banking</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Payment Date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <TextField
            label="Notes / Reference (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
            size="small"
            placeholder="Transaction ID, Cheque No, remarks..."
          />

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
              FIFO Payment Allocation Preview (Clears Oldest Bills First)
            </Typography>
            {isBillsLoading ? (
              <Skeleton height={120} />
            ) : unpaidBills.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No unpaid bills found for this customer.</Typography>
            ) : (
              <TableContainer component={Card} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Bill #</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Bill Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Owed</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>Allocated Payment</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Updated Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allocations.map((row) => (
                      <TableRow key={row._id} hover>
                        <TableCell><strong>{row.billNumber}</strong></TableCell>
                        <TableCell>{new Date(row.billDate || row.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell align="right">{formatCurrency(row.finalAmount)}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>{formatCurrency(row.owed)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                          {formatCurrency(row.allocated)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={row.newStatus}
                            size="small"
                            color={row.newStatus === 'Paid' ? 'success' : row.newStatus === 'Partially Paid' ? 'warning' : 'default'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !payAmount || Number(payAmount) <= 0 || unpaidBills.length === 0}
        >
          {isSubmitting ? 'Recording Payment...' : `Submit Payment (${formatCurrency(payAmount)})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Customer Date-Wise Payment History Dialog ==========
const CustomerPaymentHistoryDialog = ({ open, onClose, customer }) => {
  const { data: billsData, isLoading } = useGetBillsByCustomerQuery(customer._id, { skip: !open });
  const bills = billsData?.data || [];

  // Extract all date-wise payment log entries across all bills for this customer
  const paymentLogs = [];
  bills.forEach((bill) => {
    if (bill.payments && Array.isArray(bill.payments)) {
      bill.payments.forEach((p) => {
        paymentLogs.push({
          ...p,
          billNumber: bill.billNumber,
          billId: bill._id,
        });
      });
    }
  });

  // Sort payment logs descending by date
  paymentLogs.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          <Typography variant="h6" fontWeight={800}>
            Payment History Log - {customer.shopName}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Skeleton height={200} />
        ) : paymentLogs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No payment transactions logged yet for this store.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Card} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Bill #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Amount Paid</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes / Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paymentLogs.map((log, idx) => (
                  <TableRow key={log._id || idx} hover>
                    <TableCell>
                      {new Date(log.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell><strong>{log.billNumber}</strong></TableCell>
                    <TableCell><Chip label={log.paymentMethod || 'Cash'} size="small" variant="outlined" /></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'success.main' }}>
                      {formatCurrency(log.amount)}
                    </TableCell>
                    <TableCell color="text.secondary">{log.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Customer Row with Bills ==========
const CustomerRow = ({ customer, onEdit }) => {
  const [open, setOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentBill, setPaymentBill] = useState(null);
  const [bulkPaymentOpen, setBulkPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: billsData } = useGetBillsByCustomerQuery(customer._id, { skip: !open && !bulkPaymentOpen && !historyOpen });
  const [updateBillPayment, { isLoading: isUpdatingPayment }] = useUpdateBillPaymentMutation();
  const bills = billsData?.data || [];

  const handleRecordPayment = async (payload) => {
    if (!paymentBill) return;
    try {
      if (typeof payload === 'number') {
        await updateBillPayment({ id: paymentBill._id, amount: payload }).unwrap();
      } else {
        await updateBillPayment({ id: paymentBill._id, ...payload }).unwrap();
      }
      setPaymentBill(null);
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
          <Chip
            label={formatCurrency(customer.pendingCredit)}
            size="small"
            color={customer.pendingCredit > 0 ? 'warning' : 'success'}
            variant="outlined"
            onClick={() => customer.pendingCredit > 0 && setBulkPaymentOpen(true)}
            title={customer.pendingCredit > 0 ? 'Click to record payment across bills' : 'No pending owed'}
            sx={{
              fontWeight: 700,
              cursor: customer.pendingCredit > 0 ? 'pointer' : 'default',
              '&:hover': customer.pendingCredit > 0 ? { bgcolor: 'warning.main', color: '#fff' } : {},
            }}
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" title="Payment History Log" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon fontSize="small" color="action" />
            </IconButton>
            <IconButton size="small" title="Edit Store" onClick={() => onEdit(customer)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Stack>
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
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Paid</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remaining</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bills.map((b) => {
                      const totalQty = b.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                      const paid = b.paidAmount || 0;
                      const remaining = Math.max(0, b.finalAmount - paid);
                      const isPaid = b.status === 'Paid';
                      const isPartial = b.status === 'Partially Paid';
                      return (
                        <TableRow key={b._id} hover>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{b.billNumber}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(b.billDate || b.createdAt).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{b.items?.length || 0}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{totalQty}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(b.finalAmount)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'success.main' }}>{formatCurrency(paid)}</TableCell>
                          <TableCell
                            align="right"
                            onClick={() => remaining > 0 && setBulkPaymentOpen(true)}
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: remaining > 0 ? 'error.main' : 'text.secondary',
                              cursor: remaining > 0 ? 'pointer' : 'default',
                              '&:hover': remaining > 0 ? { textDecoration: 'underline' } : {},
                            }}
                          >
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={b.status}
                              size="small"
                              color={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
                              onClick={() => setPaymentBill(b)}
                              sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 70 }}
                              title="Click to change or revert payment status"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Button size="small" onClick={() => setSelectedBill(b)}>View</Button>
                              <IconButton size="small" color="primary" title="Download PDF" onClick={() => downloadBillPdf(b._id, b)}>
                                <PdfIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

      {paymentBill && (
        <RecordPaymentDialog
          open={Boolean(paymentBill)}
          onClose={() => setPaymentBill(null)}
          bill={paymentBill}
          onSave={handleRecordPayment}
          isLoading={isUpdatingPayment}
        />
      )}

      {bulkPaymentOpen && (
        <CustomerBulkPaymentDialog
          open={bulkPaymentOpen}
          onClose={() => setBulkPaymentOpen(false)}
          customer={customer}
        />
      )}

      {historyOpen && (
        <CustomerPaymentHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          customer={customer}
        />
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
                customers.map((c) => <CustomerRow key={c._id} customer={c} onEdit={handleEdit} />)
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
