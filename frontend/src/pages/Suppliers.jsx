import React, { useState } from 'react';
import {
  Box, Typography, Card, Button, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Collapse, Skeleton, alpha, Divider, Grid, Stack, Alert, Autocomplete, Paper,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  KeyboardArrowDown, KeyboardArrowUp, LocalShipping as SupplierIcon,
  Receipt as BillIcon, Close as CloseIcon, PhoneAndroid as PhoneIcon,
  Visibility as ViewIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import { useGetSuppliersQuery, useCreateSupplierMutation, useUpdateSupplierMutation } from '../api/supplierApi';
import { useGetPurchasesBySupplierQuery, useCreatePurchaseMutation, useUpdatePurchasePaymentMutation, useUpdatePurchaseMutation, useLazyGetNextInvoiceNumberQuery } from '../api/purchaseApi';
import { useGetInventoryQuery, useCreateProductMutation } from '../api/inventoryApi';

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

// ========== Quick Add Mobile Product Dialog (Inside Supplier Flow) ==========
const QuickAddProductDialog = ({ open, onClose, onCreated }) => {
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    model: '',
    lowStockThreshold: 5,
  });

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!form.name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    try {
      // Auto-generate SKU from name
      const skuBase = form.name.trim().toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9\-]/g, '').slice(0, 20);
      const skuSuffix = Math.floor(1000 + Math.random() * 9000);
      const sku = `${skuBase}-${skuSuffix}`;

      const res = await createProduct({
        ...form,
        sku,
        sellingPrice: 0,
        stock: 0, // Stock starts at 0, purchase bill will increment it
      }).unwrap();

      onCreated(res.data);
      onClose();
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to create product model');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add New Mobile Model</DialogTitle>
      <DialogContent dividers>
        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Mobile / Product Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. iPhone 16 128GB Black"
            fullWidth size="small"
          />
          <TextField
            label="Model Number"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            placeholder="e.g. A3089"
            fullWidth size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading || !form.name.trim()}>
          {isLoading ? 'Creating...' : 'Create Model'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Purchase Bill Dialog (Create Stock Receipt) ==========
const PurchaseBillDialog = ({ open, onClose, supplierId, products, refetchProducts }) => {
  const [createPurchase, { isLoading }] = useCreatePurchaseMutation();
  const [fetchNextInvoice] = useLazyGetNextInvoiceNumberQuery();

  const [errorMsg, setErrorMsg] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    invoiceNumber: '',
    purchaseDate: todayStr,
    commissionPercent: 0,
    travelCharge: 0,
    notes: '',
  });

  const [items, setItems] = useState([{ productId: '', quantity: 1, purchasePrice: '', imeiNumbers: '' }]);

  const generateAutoInvoice = async () => {
    try {
      const res = await fetchNextInvoice().unwrap();
      if (res?.data?.invoiceNumber) {
        setForm((prev) => ({ ...prev, invoiceNumber: res.data.invoiceNumber }));
      }
    } catch (err) {
      console.error('Failed to get next invoice number', err);
    }
  };

  React.useEffect(() => {
    if (open) {
      generateAutoInvoice();
    }
  }, [open]);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, purchasePrice: '', imeiNumbers: '' }]);
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

  const travelChargeVal = Number(form.travelCharge) || 0;
  const commAmount = Math.round(((subtotal + travelChargeVal) * (Number(form.commissionPercent) || 0)) / 100);
  const totalAmount = subtotal + commAmount + travelChargeVal;

  const handleSubmit = async () => {
    setErrorMsg('');
    const payload = {
      supplierId,
      invoiceNumber: form.invoiceNumber,
      purchaseDate: form.purchaseDate,
      paidAmount: 0,
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
      resetForm();
      onClose();
    } catch (err) {
      setErrorMsg(err?.data?.message || 'Failed to record purchase bill');
    }
  };

  const resetForm = () => {
    setForm({ invoiceNumber: '', purchaseDate: new Date().toISOString().slice(0, 10), commissionPercent: 0, travelCharge: 0, notes: '' });
    setItems([{ productId: '', quantity: 1, purchasePrice: '', imeiNumbers: '' }]);
  };

  const handleProductCreated = (newProd) => {
    if (refetchProducts) refetchProducts();
    const updated = [...items];
    const lastIdx = updated.length - 1;
    if (lastIdx >= 0 && !updated[lastIdx].productId) {
      updated[lastIdx].productId = newProd._id;
    } else {
      updated.push({ productId: newProd._id, quantity: 1, purchasePrice: '', imeiNumbers: '' });
    }
    setItems(updated);
  };

  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Add Stock Receipt / Supplier Bill</span>
          <Button size="small" startIcon={<RefreshIcon />} onClick={generateAutoInvoice} title="Regenerate invoice number">
            Auto Invoice#
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Supplier Invoice # *"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  fullWidth
                  size="small"
                  helperText="Auto-generated invoice number"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Purchase Date *"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField label="Commission %" type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} fullWidth size="small" />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField label="Travel Charge ₹" type="number" value={form.travelCharge} onChange={(e) => setForm({ ...form, travelCharge: e.target.value })} fullWidth size="small" />
              </Grid>
            </Grid>
          </Stack>

          <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mobile Stock Items</Typography>
            <Button
              size="small"
              startIcon={<PhoneIcon fontSize="small" />}
              onClick={() => setShowAddProduct(true)}
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              + Add New Mobile Model
            </Button>
          </Box>

          {items.map((item, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid item xs={3.5}>
                <Autocomplete
                  options={sortedProducts}
                  getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.sku})`}
                  value={sortedProducts.find(p => p._id === item.productId) || null}
                  onChange={(event, newValue) => {
                    updateItem(i, 'productId', newValue ? newValue._id : '');
                  }}
                  isOptionEqualToValue={(option, val) => option._id === (val?._id || val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Mobile Item *" size="small" fullWidth placeholder="Filter alphabetically..." />
                  )}
                />
              </Grid>
              <Grid item xs={2}><TextField label="Qty *" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} fullWidth size="small" /></Grid>
              <Grid item xs={2}><TextField label="Purchase Price ₹ *" type="number" value={item.purchasePrice} onChange={(e) => updateItem(i, 'purchasePrice', e.target.value)} fullWidth size="small" /></Grid>
              <Grid item xs={3.5}><TextField label="IMEI Numbers (comma-separated)" value={item.imeiNumbers} onChange={(e) => updateItem(i, 'imeiNumbers', e.target.value)} fullWidth size="small" /></Grid>
              <Grid item xs={1}>{items.length > 1 && <IconButton size="small" onClick={() => removeItem(i)} color="error"><DeleteIcon fontSize="small" /></IconButton>}</Grid>
            </Grid>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>Add Another Row</Button>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">Total Quantity: <strong>{items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} Units</strong></Typography>
            <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(subtotal)}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Commission: <strong>{formatCurrency(commAmount)}</strong></Typography>
            <Typography variant="body2" color="text.secondary">Travel: <strong>{formatCurrency(Number(form.travelCharge) || 0)}</strong></Typography>
            <Typography variant="subtitle1" fontWeight={800} color="primary.main">Total: {formatCurrency(totalAmount)}</Typography>
          </Box>

          <TextField label="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth size="small" sx={{ mt: 2 }} multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isLoading || items.every(i => !i.productId)}>
            {isLoading ? 'Saving...' : 'Save Purchase Bill & Add Inventory'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Add Product Sub-Dialog */}
      {showAddProduct && (
        <QuickAddProductDialog
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onCreated={handleProductCreated}
        />
      )}
    </>
  );
};

// ========== Admin Edit Purchase Dialog ==========
const EditPurchaseDialog = ({ open, onClose, purchase, products = [], refetchProducts, onSave, isLoading }) => {
  const [commPercent, setCommPercent] = useState(purchase?.commissionPercent || 0);
  const [travel, setTravel] = useState(purchase?.travelCharge || 0);
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [purchaseDate, setPurchaseDate] = useState(
    purchase?.purchaseDate ? new Date(purchase.purchaseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddProduct, setShowAddProduct] = useState(false);

  React.useEffect(() => {
    if (purchase) {
      setCommPercent(purchase.commissionPercent || 0);
      setTravel(purchase.travelCharge || 0);
      setNotes(purchase.notes || '');
      setPurchaseDate(
        purchase.purchaseDate ? new Date(purchase.purchaseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setItems(
        (purchase.items || []).map((item) => ({
          productId: item.product?._id || item.product,
          quantity: item.quantity || 1,
          purchasePrice: item.purchasePrice || 0,
          imeiNumbers: Array.isArray(item.imeiNumbers)
            ? item.imeiNumbers.join(', ')
            : item.imeiNumbers || '',
        }))
      );
    }
  }, [purchase]);

  const addItem = () => setItems([...items, { productId: '', quantity: 1, purchasePrice: '', imeiNumbers: '' }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [products]);

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.purchasePrice) || 0;
    return sum + qty * price;
  }, 0);

  const travelChargeVal = Number(travel) || 0;
  const commAmount = Math.round(((subtotal + travelChargeVal) * (Number(commPercent) || 0)) / 100);
  const totalAmount = subtotal + commAmount + travelChargeVal;

  const handleProductCreated = (newProd) => {
    if (refetchProducts) refetchProducts();
    const updated = [...items];
    const lastIdx = updated.length - 1;
    if (lastIdx >= 0 && !updated[lastIdx].productId) {
      updated[lastIdx].productId = newProd._id;
    } else {
      updated.push({ productId: newProd._id, quantity: 1, purchasePrice: '', imeiNumbers: '' });
    }
    setItems(updated);
  };

  const handleSubmit = () => {
    setErrorMsg('');
    const validItems = items
      .filter((i) => i.productId && Number(i.quantity) > 0 && Number(i.purchasePrice) >= 0)
      .map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        purchasePrice: Number(i.purchasePrice),
        imeiNumbers: i.imeiNumbers ? i.imeiNumbers.split(',').map((s) => s.trim()).filter(Boolean) : [],
      }));

    if (validItems.length === 0) {
      setErrorMsg('At least one valid mobile stock item is required');
      return;
    }

    onSave({
      commissionPercent: Number(commPercent) || 0,
      travelCharge: Number(travel) || 0,
      notes,
      purchaseDate,
      items: validItems,
    });
  };

  if (!purchase) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Edit Purchase Bill: #{purchase.invoiceNumber}</DialogTitle>
        <DialogContent dividers>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Purchase Date *"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  label="Commission %"
                  type="number"
                  value={commPercent}
                  onChange={(e) => setCommPercent(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <TextField
                  label="Travel Charge ₹"
                  type="number"
                  value={travel}
                  onChange={(e) => setTravel(e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Stack>

          <Box sx={{ mt: 3, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Mobile Stock Items</Typography>
            <Button
              size="small"
              startIcon={<PhoneIcon fontSize="small" />}
              onClick={() => setShowAddProduct(true)}
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              + Add New Mobile Model
            </Button>
          </Box>

          {items.map((item, i) => (
            <Grid container spacing={1.5} key={i} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Grid item xs={3.5}>
                <Autocomplete
                  options={sortedProducts}
                  getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name} (${option.sku})`}
                  value={sortedProducts.find((p) => p._id === item.productId) || null}
                  onChange={(event, newValue) => {
                    updateItem(i, 'productId', newValue ? newValue._id : '');
                  }}
                  isOptionEqualToValue={(option, val) => option._id === (val?._id || val)}
                  renderInput={(params) => (
                    <TextField {...params} label="Select Mobile Item *" size="small" fullWidth placeholder="Filter product..." />
                  )}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField label="Qty *" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={2}>
                <TextField label="Purchase Price ₹ *" type="number" value={item.purchasePrice} onChange={(e) => updateItem(i, 'purchasePrice', e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={3.5}>
                <TextField label="IMEI Numbers (comma-separated)" value={item.imeiNumbers} onChange={(e) => updateItem(i, 'imeiNumbers', e.target.value)} fullWidth size="small" />
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

          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>
            Add Another Row
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              Total Quantity: <strong>{items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} Units</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Subtotal: <strong>{formatCurrency(subtotal)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Commission: <strong>{formatCurrency(commAmount)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Travel: <strong>{formatCurrency(travelChargeVal)}</strong>
            </Typography>
            <Typography variant="subtitle1" fontWeight={800} color="primary.main">
              Total: {formatCurrency(totalAmount)}
            </Typography>
          </Box>

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 2 }}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isLoading || items.every((i) => !i.productId)}>
            {isLoading ? 'Saving...' : 'Update Purchase'}
          </Button>
        </DialogActions>
      </Dialog>

      {showAddProduct && (
        <QuickAddProductDialog
          open={showAddProduct}
          onClose={() => setShowAddProduct(false)}
          onCreated={handleProductCreated}
        />
      )}
    </>
  );
};

// ========== View Purchase Bill Dialog ==========
const ViewPurchaseDialog = ({ open, onClose, purchase }) => {
  if (!purchase) return null;
  const paid = purchase.paidAmount || 0;
  const remaining = Math.max(0, purchase.totalAmount - paid);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Purchase Bill #{purchase.invoiceNumber}</span>
        <Chip label={purchase.paymentStatus} size="small" color={purchase.paymentStatus === 'Paid' ? 'success' : 'warning'} sx={{ fontWeight: 700 }} />
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Supplier: <strong>{purchase.supplier?.name}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Batch ID: <strong>{purchase.batchId}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Date: <strong>{new Date(purchase.purchaseDate || purchase.createdAt).toLocaleDateString('en-GB')}</strong></Typography>
        </Box>

        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Items</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Price Per Unit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IMEI Numbers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchase.items?.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(item.purchasePrice)}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{formatCurrency(item.total)}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, wordBreak: 'break-all' }}>
                    {item.imeiNumbers?.length > 0 ? item.imeiNumbers.join(', ') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Subtotal: <strong>{formatCurrency(purchase.subtotal)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Commission ({purchase.commissionPercent}%): <strong>{formatCurrency(purchase.commissionAmount)}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Travel Charge: <strong>{formatCurrency(purchase.travelCharge)}</strong></Typography>
          <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ mt: 0.5 }}>Grand Total: {formatCurrency(purchase.totalAmount)}</Typography>
          <Typography variant="body2" color="success.main">Amount Paid: <strong>{formatCurrency(paid)}</strong></Typography>
          {remaining > 0 && (
            <Typography variant="body2" color="error.main" fontWeight={700}>Remaining Balance to Pay: {formatCurrency(remaining)}</Typography>
          )}
        </Box>

        {purchase.notes && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">Notes</Typography>
            <Typography variant="body2">{purchase.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
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

// ========== Supplier Row with Purchase Bills ==========
const SupplierRow = ({ supplier, onEdit, products, refetchProducts, isAdmin }) => {
  const [open, setOpen] = useState(false);
  const [viewPurchase, setViewPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const { data: purchasesData } = useGetPurchasesBySupplierQuery(supplier._id, { skip: !open });
  const [updatePayment, { isLoading: isUpdatingPayment }] = useUpdatePurchasePaymentMutation();
  const [updatePurchase, { isLoading: isUpdatingPurchase }] = useUpdatePurchaseMutation();

  const purchases = purchasesData?.data || [];

  const handleRecordPayment = async (amount) => {
    if (!paymentPurchase) return;
    try {
      await updatePayment({ id: paymentPurchase._id, amount }).unwrap();
      setPaymentPurchase(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to update payment status');
    }
  };

  const handleSaveEditPurchase = async (data) => {
    if (!editingPurchase) return;
    try {
      await updatePurchase({ id: editingPurchase._id, ...data }).unwrap();
      setEditingPurchase(null);
    } catch (err) {
      alert(err?.data?.message || 'Failed to update purchase bill');
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
          {isAdmin && (
            <IconButton size="small" onClick={() => onEdit(supplier)} title="Edit Supplier"><EditIcon fontSize="small" /></IconButton>
          )}
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
                  Add Stock Receipt / Purchase Bill
                </Button>
              </Box>
              {purchases.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Invoice#</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Batch ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Purchase Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Items</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Paid</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remaining</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {purchases.map((p) => {
                      const totalQty = p.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
                      const paid = p.paidAmount || 0;
                      const remaining = Math.max(0, p.totalAmount - paid);
                      const isPaid = p.paymentStatus === 'Paid';
                      const isPartial = p.paymentStatus === 'Partially Paid';
                      return (
                        <TableRow key={p._id} hover>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{p.invoiceNumber}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{p.batchId}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{formatDateDDMMYYYY(p.purchaseDate || p.createdAt)}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.8rem' }}>{p.items?.length || 0}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{totalQty}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{formatCurrency(p.totalAmount)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', color: 'success.main' }}>{formatCurrency(paid)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: remaining > 0 ? 'error.main' : 'text.secondary' }}>
                            {formatCurrency(remaining)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={p.paymentStatus}
                              size="small"
                              color={isPaid ? 'success' : isPartial ? 'warning' : 'error'}
                              onClick={() => !isPaid && setPaymentPurchase(p)}
                              sx={{ fontWeight: 700, cursor: isPaid ? 'default' : 'pointer', minWidth: 75 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <IconButton size="small" color="primary" onClick={() => setViewPurchase(p)} title="View bill details">
                                <ViewIcon fontSize="small" />
                              </IconButton>
                              {!isPaid && isAdmin && (
                                <IconButton size="small" color="warning" onClick={() => setEditingPurchase(p)} title="Edit Purchase Bill">
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
        <PurchaseBillDialog
          open={showPurchaseForm}
          onClose={() => setShowPurchaseForm(false)}
          supplierId={supplier._id}
          products={products}
          refetchProducts={refetchProducts}
        />
      )}

      {viewPurchase && (
        <ViewPurchaseDialog
          open={Boolean(viewPurchase)}
          onClose={() => setViewPurchase(null)}
          purchase={viewPurchase}
        />
      )}

      {paymentPurchase && (
        <RecordPaymentDialog
          open={Boolean(paymentPurchase)}
          onClose={() => setPaymentPurchase(null)}
          billNumber={paymentPurchase.invoiceNumber}
          totalAmount={paymentPurchase.totalAmount}
          paidAmount={paymentPurchase.paidAmount}
          onSave={handleRecordPayment}
          isLoading={isUpdatingPayment}
        />
      )}

      {editingPurchase && (
        <EditPurchaseDialog
          open={Boolean(editingPurchase)}
          onClose={() => setEditingPurchase(null)}
          purchase={editingPurchase}
          products={products}
          refetchProducts={refetchProducts}
          onSave={handleSaveEditPurchase}
          isLoading={isUpdatingPurchase}
        />
      )}
    </>
  );
};

// ========== Main Suppliers Page ==========
const Suppliers = () => {
  const currentUser = useSelector(selectCurrentUser);
  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const { data, isLoading } = useGetSuppliersQuery(search);
  const { data: inventoryData, refetch: refetchInventory } = useGetInventoryQuery({});
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();

  const suppliers = data?.data || [];
  const productsList = inventoryData?.data || [];

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

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Suppliers</Typography>
          <Typography variant="body2" color="text.secondary">Manage suppliers, receive stock, and record purchase bills.</Typography>
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
                suppliers.map((s) => (
                  <SupplierRow
                    key={s._id}
                    supplier={s}
                    onEdit={handleEdit}
                    products={productsList}
                    refetchProducts={refetchInventory}
                    isAdmin={isAdmin}
                  />
                ))
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
