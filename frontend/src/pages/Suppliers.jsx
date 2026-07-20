import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, Skeleton, alpha, Divider, Grid, Stack,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  KeyboardArrowDown, KeyboardArrowUp, LocalShipping as SupplierIcon,
  Receipt as BillIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation, useDeleteSupplierMutation } from '../api/supplierApi';
import { useGetPurchasesBySupplierQuery, useCreatePurchaseMutation, useUpdatePurchasePaymentMutation } from '../api/purchaseApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

// ========== Supplier Form Dialog ==========
const SupplierFormDialog = ({ open, onClose, supplier, onSave }) => {
  const [form, setForm] = useState(supplier || { name: '', phone: '', email: '', address: '', gstNumber: '' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Supplier Name *" name="name" value={form.name} onChange={handleChange} fullWidth size="small" />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} fullWidth size="small" />
          <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth size="small" />
          <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth size="small" multiline rows={2} />
          <TextField label="GST Number" name="gstNumber" value={form.gstNumber} onChange={handleChange} fullWidth size="small" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(form)} disabled={!form.name.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Purchase Bill Form Dialog ==========
const PurchaseBillDialog = ({ open, onClose, supplierId, products }) => {
  const [createPurchase, { isLoading }] = useCreatePurchaseMutation();
  const [form, setForm] = useState({ invoiceNumber: '', commissionPercent: 0, travelCharge: 0, notes: '' });
  const [items, setItems] = useState([{ productId: '', quantity: '', purchasePrice: '', imeiNumbers: '' }]);

  const addItem = () => setItems([...items, { productId: '', quantity: '', purchasePrice: '', imeiNumbers: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.purchasePrice) || 0;
    return sum + qty * price;
  }, 0);
  const commAmount = Math.round((subtotal * (Number(form.commissionPercent) || 0)) / 100);
  const totalAmount = subtotal + commAmount + (Number(form.travelCharge) || 0);

  const handleSubmit = async () => {
    const payload = {
      supplierId,
      invoiceNumber: form.invoiceNumber,
      commissionPercent: Number(form.commissionPercent) || 0,
      travelCharge: Number(form.travelCharge) || 0,
      notes: form.notes,
      items: items.filter(i => i.productId && i.quantity && i.purchasePrice).map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        purchasePrice: Number(i.purchasePrice),
        imeiNumbers: i.imeiNumbers ? i.imeiNumbers.split(',').map(s => s.trim()).filter(Boolean) : [],
      })),
    };
    try {
      await createPurchase(payload).unwrap();
      onClose();
    } catch (err) {
      alert(err?.data?.message || 'Failed to create purchase');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Add Purchase Bill
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={6}><TextField label="Invoice Number *" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={3}><TextField label="Commission %" type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} fullWidth size="small" /></Grid>
          <Grid item xs={3}><TextField label="Travel Charge ₹" type="number" value={form.travelCharge} onChange={(e) => setForm({ ...form, travelCharge: e.target.value })} fullWidth size="small" /></Grid>
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>Items</Typography>
        {items.map((item, i) => (
          <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
            <Grid item xs={3}>
              <TextField select label="Product" value={item.productId} onChange={(e) => updateItem(i, 'productId', e.target.value)} fullWidth size="small" SelectProps={{ native: true }}>
                <option value="">Select...</option>
                {(products || []).map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
              </TextField>
            </Grid>
            <Grid item xs={2}><TextField label="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} fullWidth size="small" /></Grid>
            <Grid item xs={2}><TextField label="Price ₹" type="number" value={item.purchasePrice} onChange={(e) => updateItem(i, 'purchasePrice', e.target.value)} fullWidth size="small" /></Grid>
            <Grid item xs={4}><TextField label="IMEI Numbers (comma-separated, optional)" value={item.imeiNumbers} onChange={(e) => updateItem(i, 'imeiNumbers', e.target.value)} fullWidth size="small" /></Grid>
            <Grid item xs={1}>{items.length > 1 && <IconButton size="small" onClick={() => removeItem(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>}</Grid>
          </Grid>
        ))}
        <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>Add Item</Button>

        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
          <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Commission: <strong>{formatCurrency(commAmount)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Travel: <strong>{formatCurrency(Number(form.travelCharge) || 0)}</strong></Typography>
          <Typography variant="subtitle1" fontWeight={800} color="primary.main">Total: {formatCurrency(totalAmount)}</Typography>
        </Box>

        <TextField label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth size="small" sx={{ mt: 2 }} multiline rows={2} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading || !form.invoiceNumber || items.every(i => !i.productId)}>
          {isLoading ? 'Saving...' : 'Save Purchase Bill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Supplier Row with Purchase Bills ==========
const SupplierRow = ({ supplier, onEdit, onDelete, products }) => {
  const [open, setOpen] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const { data: purchasesData } = useGetPurchasesBySupplierQuery(supplier._id, { skip: !open });
  const [updatePayment] = useUpdatePurchasePaymentMutation();
  const purchases = purchasesData?.data || [];

  const handlePaymentToggle = async (purchase) => {
    const newStatus = purchase.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      await updatePayment({ id: purchase._id, paymentStatus: newStatus }).unwrap();
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
        <TableCell sx={{ fontWeight: 600 }}>{supplier.name}</TableCell>
        <TableCell>{supplier.phone || '-'}</TableCell>
        <TableCell>{supplier.address || '-'}</TableCell>
        <TableCell>{supplier.gstNumber || '-'}</TableCell>
        <TableCell align="center">{supplier.purchaseCount || 0}</TableCell>
        <TableCell align="right">
          <Chip label={formatCurrency(supplier.unpaidAmount)} size="small" color={supplier.unpaidAmount > 0 ? 'warning' : 'success'} variant="outlined" sx={{ fontWeight: 700 }} />
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => onEdit(supplier)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => onDelete(supplier._id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Purchase Bills ({purchases.length})
                </Typography>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setShowPurchaseForm(true)}>
                  Add Purchase Bill
                </Button>
              </Box>
              {purchases.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Invoice#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Batch ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Items</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Subtotal</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Commission</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Travel</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Payment</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{p.invoiceNumber}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{p.batchId}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{p.items?.length || 0}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(p.subtotal)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(p.commissionAmount)} ({p.commissionPercent}%)</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(p.travelCharge)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(p.totalAmount)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={p.paymentStatus}
                            size="small"
                            color={p.paymentStatus === 'Paid' ? 'success' : 'warning'}
                            onClick={() => handlePaymentToggle(p)}
                            sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 70 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  No purchase bills yet.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>

      {showPurchaseForm && (
        <PurchaseBillDialog open={showPurchaseForm} onClose={() => setShowPurchaseForm(false)} supplierId={supplier._id} products={products} />
      )}
    </>
  );
};

// ========== Products API hook for product list ==========
import { apiSlice } from '../api/apiSlice';
const useProductsList = () => {
  const { data } = apiSlice.endpoints.getProducts
    ? apiSlice.useGetProductsQuery?.() || {}
    : {};
  return data?.data?.products || [];
};

// ========== Main Suppliers Page ==========
const Suppliers = () => {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const { data, isLoading } = useGetSuppliersQuery(search);
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  // Get products list for purchase bill form — use a simple fetch via RTK
  const [productsList, setProductsList] = useState([]);
  React.useEffect(() => {
    fetch('/api/products?pageSize=500', {
      headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth') || '{}')?.accessToken || ''}` },
    })
      .then(r => r.json())
      .then(d => setProductsList(d?.data?.products || []))
      .catch(() => {});
  }, [formOpen]);

  const suppliers = data?.data || [];

  const handleSave = async (form) => {
    try {
      if (editingSupplier) {
        await updateSupplier({ id: editingSupplier._id, ...form }).unwrap();
      } else {
        await createSupplier(form).unwrap();
      }
      setFormOpen(false);
      setEditingSupplier(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to save supplier');
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await deleteSupplier(id).unwrap();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete supplier');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Suppliers</Typography>
          <Typography variant="body2" color="text.secondary">Manage suppliers and their purchase bills.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingSupplier(null); setFormOpen(true); }}>
          Add Supplier
        </Button>
      </Box>

      <Card sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth size="small" placeholder="Search suppliers..."
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
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>GST</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Bills</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Unpaid</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : suppliers.length > 0 ? (
                suppliers.map((s) => <SupplierRow key={s._id} supplier={s} onEdit={handleEdit} onDelete={handleDelete} products={productsList} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No suppliers found. Click "Add Supplier" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {formOpen && (
        <SupplierFormDialog
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingSupplier(null); }}
          supplier={editingSupplier}
          onSave={handleSave}
        />
      )}
    </Box>
  );
};

export default Suppliers;
