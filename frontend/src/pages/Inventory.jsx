import React, { useState } from 'react';
import {
  Box, Typography, Card, TextField, InputAdornment, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Collapse, IconButton, Skeleton, alpha,
} from '@mui/material';
import {
  Search as SearchIcon, KeyboardArrowDown, KeyboardArrowUp,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { useGetInventoryQuery } from '../api/inventoryApi';

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const BatchRow = ({ batches }) => (
  <Table size="small" sx={{ ml: 4, maxWidth: 700 }}>
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Batch ID</TableCell>
        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Supplier</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Purchase Price</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remaining</TableCell>
        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {batches.map((b, i) => (
        <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
          <TableCell sx={{ fontSize: '0.8rem' }}>{b.batchId}</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>{b.supplier}</TableCell>
          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{formatCurrency(b.purchasePrice)}</TableCell>
          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{b.remainingQty}</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(b.date).toLocaleDateString('en-IN')}</TableCell>
        </TableRow>
      ))}
      {batches.length === 0 && (
        <TableRow>
          <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            No batch records
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

const ProductRow = ({ product }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
        <TableCell>{product.brand?.name || '-'}</TableCell>
        <TableCell>{product.category?.name || '-'}</TableCell>
        <TableCell>{product.sku}</TableCell>
        <TableCell align="center">
          <Chip
            label={product.stock}
            size="small"
            color={product.stock === 0 ? 'error' : product.stock <= (product.lowStockThreshold || 5) ? 'warning' : 'success'}
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 50 }}
          />
        </TableCell>
        <TableCell align="right">{formatCurrency(product.sellingPrice)}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02) }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
                Batch Details
              </Typography>
              <BatchRow batches={product.batches || []} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const Inventory = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useGetInventoryQuery({ keyword: search });
  const products = data?.data || [];

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Inventory</Typography>
          <Typography variant="body2" color="text.secondary">
            View all mobile stock with batch-wise purchase details.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <InventoryIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
        </Box>
      </Box>

      <Card sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, SKU, or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
            ),
          }}
        />
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Stock</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Selling Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : products.length > 0 ? (
                products.map((p) => <ProductRow key={p._id} product={p} />)
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No products found. Add products via supplier purchase bills.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

export default Inventory;
