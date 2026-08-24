import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  InputAdornment,
  Pagination,
  Tooltip,
  Alert,
  Checkbox,
  ListItemText,
  Menu,
  Divider,
} from '@mui/material';
import {
  CloudUpload as ImportIcon,
  Add as AddIcon,
  Compare as CompareIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  ViewColumn as ViewColumnIcon,
  Delete as DeleteIcon,
  DeleteForever as DeleteForeverIcon,
} from '@mui/icons-material';
import {
  useGetWholesalerSellersQuery,
  useCreateWholesalerSellerMutation,
  useImportWholesalerPricesMutation,
  useGetWholesalerPricesQuery,
  useDeleteSellerPricesMutation,
} from '../api/wholesalerApi';

const formatCurrency = (val) => {
  if (!val || val === '-') return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
};

// ==========================================
// 1. IMPORT PRICE LIST TAB
// ==========================================
const ImportTab = () => {
  const { data: sellersData, isLoading: isSellersLoading } = useGetWholesalerSellersQuery();
  const sellers = sellersData?.data || [];

  const [createSeller, { isLoading: isCreatingSeller }] = useCreateWholesalerSellerMutation();
  const [importPrices, { isLoading: isImporting }] = useImportWholesalerPricesMutation();
  const [deleteSellerPrices, { isLoading: isDeleting }] = useDeleteSellerPricesMutation();

  const [sellerId, setSellerId] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');

  // Seller Modal
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');

  // Confirm Delete Seller Prices Modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Result Summary Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const selectedSeller = sellers.find((s) => s._id === sellerId);

  const handleAddSeller = async () => {
    if (!newSellerName.trim()) return;
    try {
      const res = await createSeller({ name: newSellerName.trim() }).unwrap();
      setSellerId(res.data._id);
      setNewSellerName('');
      setSellerModalOpen(false);
    } catch (err) {
      alert(err?.data?.message || 'Failed to create seller');
    }
  };

  const handleDeleteSellerPrices = async () => {
    if (!sellerId) return;
    try {
      const res = await deleteSellerPrices(sellerId).unwrap();
      alert(res.message || `Deleted price data for ${selectedSeller?.name}`);
      setConfirmDeleteOpen(false);
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete seller price list data');
    }
  };

  const handleImport = async () => {
    if (!sellerId) {
      alert('Please select a Wholesaler Seller');
      return;
    }
    if (!rawText.trim()) {
      alert('Please paste the WhatsApp raw text message');
      return;
    }

    try {
      const result = await importPrices({
        sellerId,
        importDate,
        rawText,
      }).unwrap();

      setImportResult(result);
      setSummaryModalOpen(true);
    } catch (err) {
      alert(err?.data?.message || 'Failed to import price list');
    }
  };

  const handleClear = () => {
    setRawText('');
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Select Seller</InputLabel>

              <Select
                value={sellerId}
                label="Select Seller"
                onChange={(e) => setSellerId(e.target.value)}
                disabled={isSellersLoading}
              >
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              fullWidth
              sx={{ height: '40px' }}
              onClick={() => setSellerModalOpen(true)}
            >
              Add New Seller
            </Button>
          </Grid>

          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              fullWidth
              sx={{ height: '40px', fontWeight: 700 }}
              disabled={!sellerId || isDeleting}
              onClick={() => setConfirmDeleteOpen(true)}
              title="Delete all price list data for the selected seller from database"
            >
              Clear Seller Price Data
            </Button>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              label="Date"
              type="date"
              size="small"
              fullWidth
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Raw WhatsApp Price Message:
            </Typography>
            <TextField
              multiline
              rows={12}
              fullWidth
              placeholder={`Paste raw WhatsApp text here, example:\nRedmi. All fresh\nA5 3/64 11000\nA7 pro 4g 4/64 11800\n15A 5g 4/64 14500\n\nPoco\nC71 4/64 10700 fresh`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                disabled={!rawText}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={isImporting ? <CircularProgress size={20} color="inherit" /> : <ImportIcon />}
                onClick={handleImport}
                disabled={isImporting || !sellerId || !rawText.trim()}
              >
                {isImporting ? 'Importing...' : 'Import Price List'}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Add New Seller Dialog */}
      <Dialog open={sellerModalOpen} onClose={() => setSellerModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Wholesaler Seller</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            margin="dense"
            label="Seller Name *"
            fullWidth
            size="small"
            value={newSellerName}
            onChange={(e) => setNewSellerName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellerModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddSeller} disabled={isCreatingSeller || !newSellerName.trim()}>
            {isCreatingSeller ? 'Saving...' : 'Save Seller'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Clear Seller Price Data Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon /> Clear Seller Price List Data
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete all price list data for <strong>{selectedSeller?.name}</strong> from the database?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, p: 1.5, bgcolor: 'error.light', color: '#fff', borderRadius: 1, fontWeight: 600 }}>
            ⚠️ This will permanently remove all price records stored for {selectedSeller?.name} from the database.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSellerPrices}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Price Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Result Summary Dialog */}
      <Dialog open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
          Import Result Summary
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              <strong>Import Processed:</strong> {importResult?.createdCount || 0} New Products Added | {importResult?.updatedCount || 0} Prices Overwritten / Updated | {importResult?.unchangedCount || 0} Unchanged
            </Alert>

            {importResult?.updateLogs && importResult.updateLogs.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'warning.dark' }}>
                  Overwritten Price Changes Detail ({importResult.updateLogs.length}):
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, mb: 1 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'warning.light' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Product Raw Text</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#fff' }}>Change Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.updateLogs.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.line}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'warning.main' }}>{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {importResult?.skippedLines && importResult.skippedLines.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Skipped Lines Detail:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Line Content</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.skippedLines.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.line}</TableCell>
                          <TableCell color="error">{item.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setSummaryModalOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ==========================================
// 2. PRICE COMPARISON TAB
// ==========================================
const ComparisonTab = ({ onSelectHistory }) => {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [variant, setVariant] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [importDate, setImportDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('phoneName');
  const [sortOrder, setSortOrder] = useState('asc');

  // State for toggling visible seller columns & deleting seller data
  const [selectedSellerIds, setSelectedSellerIds] = useState([]);
  const [sellerMenuAnchor, setSellerMenuAnchor] = useState(null);
  const [sellerToDelete, setSellerToDelete] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const [deleteSellerPrices, { isLoading: isDeleting }] = useDeleteSellerPricesMutation();

  const handleDeleteSellerPrices = async () => {
    if (!sellerToDelete) return;
    try {
      const res = await deleteSellerPrices(sellerToDelete._id).unwrap();
      alert(res.message || `Deleted price list data for ${sellerToDelete.name}`);
      setConfirmDeleteOpen(false);
      setSellerToDelete(null);
      refetch();
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete seller price list data');
    }
  };

  const { data: responseData, isLoading, refetch } = useGetWholesalerPricesQuery({
    search,
    brand,
    color,
    variant,
    sellerId,
    importDate,
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const comparisonData = responseData?.data || { sellers: [], rows: [], pagination: {} };
  const dynamicSellers = comparisonData.sellers || [];
  const rows = comparisonData.rows || [];

  // Auto-initialize selected seller IDs when dynamic sellers are loaded
  React.useEffect(() => {
    if (dynamicSellers.length > 0 && selectedSellerIds.length === 0) {
      setSelectedSellerIds(dynamicSellers.map((s) => s._id.toString()));
    }
  }, [dynamicSellers]);

  // Compute visible sellers list based on user selections
  const visibleSellers = useMemo(() => {
    if (selectedSellerIds.length === 0) return dynamicSellers;
    return dynamicSellers.filter((s) => selectedSellerIds.includes(s._id.toString()));
  }, [dynamicSellers, selectedSellerIds]);

  const handleToggleSeller = (id) => {
    if (selectedSellerIds.includes(id)) {
      setSelectedSellerIds(selectedSellerIds.filter((sId) => sId !== id));
    } else {
      setSelectedSellerIds([...selectedSellerIds, id]);
    }
  };

  const handleSelectAllSellers = () => {
    setSelectedSellerIds(dynamicSellers.map((s) => s._id.toString()));
  };

  const handleClearAllSellers = () => {
    setSelectedSellerIds([]);
  };

  const handleResetFilters = () => {
    setSearch('');
    setBrand('');
    setColor('');
    setVariant('');
    setSellerId('');
    setImportDate('');
    setPage(1);
    setLimit(50);
    setSelectedSellerIds(dynamicSellers.map((s) => s._id.toString()));
  };

  // CSV Export for visible sellers
  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = ['Phone / Model', 'Variant', ...visibleSellers.map((s) => s.name), 'Price Diff'];
    const csvRows = [headers.join(',')];

    rows.forEach((row) => {
      const sellerPricesMap = new Map();
      row.prices.forEach((p) => sellerPricesMap.set(p.sellerId.toString(), p.price));

      const visiblePrices = visibleSellers.map((s) => sellerPricesMap.get(s._id.toString())).filter(Boolean);
      const minP = visiblePrices.length > 0 ? Math.min(...visiblePrices) : 0;
      const maxP = visiblePrices.length > 0 ? Math.max(...visiblePrices) : 0;
      const diff = maxP - minP;

      const line = [
        `"${row.phoneName}"`,
        `"${row.variant}"`,
        ...visibleSellers.map((s) => sellerPricesMap.get(s._id.toString()) || '-'),
        diff || 0,
      ];
      csvRows.push(line.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Wholesaler_Price_Comparison_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Filters & Options Toolbar */}
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search phone, model..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              size="small"
              fullWidth
              label="Brand"
              value={brand}
              onChange={(e) => { setBrand(e.target.value); setPage(1); }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              size="small"
              fullWidth
              label="Variant"
              value={variant}
              onChange={(e) => { setVariant(e.target.value); setPage(1); }}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              type="date"
              size="small"
              fullWidth
              label="Import Date"
              value={importDate}
              onChange={(e) => { setImportDate(e.target.value); setPage(1); }}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Rows Per Page / Show All option */}
          <Grid item xs={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Show / Rows Per Page</InputLabel>
              <Select
                value={limit}
                label="Show / Rows Per Page"
                onChange={(e) => {
                  setLimit(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value={25}>25 per page</MenuItem>
                <MenuItem value={50}>50 per page</MenuItem>
                <MenuItem value={100}>100 per page</MenuItem>
                <MenuItem value={200}>200 per page</MenuItem>
                <MenuItem value="all">
                  <strong>Show All (All Rows)</strong>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Action Row */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {/* Option to Add / Remove Seller Columns */}
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<ViewColumnIcon />}
                onClick={(e) => setSellerMenuAnchor(e.currentTarget)}
                sx={{ fontWeight: 700 }}
              >
                Seller Columns ({visibleSellers.length}/{dynamicSellers.length})
              </Button>
              <Menu
                anchorEl={sellerMenuAnchor}
                open={Boolean(sellerMenuAnchor)}
                onClose={() => setSellerMenuAnchor(null)}
                PaperProps={{ sx: { width: 300, maxHeight: 350 } }}
              >
                <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight={800}>Toggle Seller Columns</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button size="small" sx={{ fontSize: '0.7rem', p: 0.2 }} onClick={handleSelectAllSellers}>Select All</Button>
                    <Button size="small" sx={{ fontSize: '0.7rem', p: 0.2 }} color="error" onClick={handleClearAllSellers}>Clear</Button>
                  </Box>
                </Box>
                <Divider />
                {dynamicSellers.map((s) => {
                  const isChecked = selectedSellerIds.length === 0 || selectedSellerIds.includes(s._id.toString());
                  return (
                    <MenuItem key={s._id} sx={{ py: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }} onClick={() => handleToggleSeller(s._id.toString())}>
                        <Checkbox checked={isChecked} size="small" />
                        <ListItemText primary={s.name} primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }} />
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        title={`Delete price list data for ${s.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSellerToDelete(s);
                          setSellerMenuAnchor(null);
                          setConfirmDeleteOpen(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </MenuItem>
                  );
                })}
              </Menu>

              <Button size="small" variant="outlined" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
                Refresh
              </Button>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" color="success" startIcon={<ExportIcon />} onClick={handleExportCSV}>
                Export CSV / Excel
              </Button>
              <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
                Print
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* Comparison Table */}
      <Card variant="outlined">
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white', zIndex: 11, position: 'sticky', left: 0, minWidth: 200 }}>
                  Phone / Model
                </TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white', zIndex: 11, position: 'sticky', left: 200, minWidth: 80 }}>
                  Variant
                </TableCell>
                {visibleSellers.map((s) => (
                  <TableCell key={s._id} align="center" sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white', minWidth: 120 }}>
                    {s.name}
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white', minWidth: 80 }}>
                  Diff ₹
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3 + visibleSellers.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + visibleSellers.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No wholesaler price comparison records found. Import price lists first.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const sellerPricesMap = new Map();
                  row.prices.forEach((p) => sellerPricesMap.set(p.sellerId.toString(), p.price));

                  // Calculate minPrice and priceDiff dynamically based on VISIBLE sellers only
                  const visiblePrices = visibleSellers
                    .map((s) => sellerPricesMap.get(s._id.toString()))
                    .filter(Boolean);

                  const minPrice = visiblePrices.length > 0 ? Math.min(...visiblePrices) : 0;
                  const maxPrice = visiblePrices.length > 0 ? Math.max(...visiblePrices) : 0;
                  const priceDiff = maxPrice - minPrice;

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 9 }}>
                        {row.phoneName}
                      </TableCell>
                      <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 9, fontWeight: 600, color: 'text.secondary' }}>
                        {row.variant || '-'}
                      </TableCell>

                      {visibleSellers.map((s) => {
                        const priceVal = sellerPricesMap.get(s._id.toString());
                        const isLowest = priceVal && priceVal === minPrice && visiblePrices.length > 1;

                        return (
                          <TableCell
                            key={s._id}
                            align="center"
                            sx={{
                              fontWeight: isLowest ? 800 : 400,
                              bgcolor: isLowest ? '#e8f5e9' : 'inherit',
                              color: isLowest ? '#2e7d32' : 'inherit',
                            }}
                          >
                            {priceVal ? formatCurrency(priceVal) : '-'}
                          </TableCell>
                        );
                      })}

                      <TableCell align="center" sx={{ fontWeight: 700, color: priceDiff > 0 ? 'error.main' : 'text.secondary' }}>
                        {priceDiff > 0 ? formatCurrency(priceDiff) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer & Pagination Controls */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing <strong>{rows.length}</strong> of <strong>{comparisonData.pagination?.total || rows.length}</strong> product comparison records
            {limit === 'all' && (
              <Chip label="Show All Mode" size="small" color="primary" sx={{ ml: 1.5, fontWeight: 700 }} />
            )}
          </Typography>

          {limit !== 'all' && comparisonData.pagination?.pages > 1 && (
            <Pagination
              count={comparisonData.pagination.pages}
              page={page}
              onChange={(e, val) => setPage(val)}
              color="primary"
            />
          )}
        </Box>
      </Card>

      {/* Confirm Delete Seller Prices Dialog */}
      <Dialog open={confirmDeleteOpen} onClose={() => { setConfirmDeleteOpen(false); setSellerToDelete(null); }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon /> Delete Seller Price Data
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete all price list records for seller <strong>{sellerToDelete?.name}</strong> from the database?
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, p: 1.5, bgcolor: 'error.light', color: '#fff', borderRadius: 1, fontWeight: 600 }}>
            ⚠️ This will permanently remove all price records stored for {sellerToDelete?.name} from the database.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setConfirmDeleteOpen(false); setSellerToDelete(null); }} variant="outlined">Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteSellerPrices}
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete Price Data'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ==========================================
// MAIN WHOLESALER COMPARISON MODULE PAGE
// ==========================================
const WholesalerComparisonModule = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Wholesaler Price Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Import raw WhatsApp daily mobile price lists from sellers and compare lowest prices instantly.
          </Typography>
        </Box>
      </Box>

      <Card variant="outlined">
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Tab icon={<ImportIcon />} iconPosition="start" label="1. Import Price List" />
          <Tab icon={<CompareIcon />} iconPosition="start" label="2. Price Comparison" />
        </Tabs>
      </Card>

      {activeTab === 0 && <ImportTab />}
      {activeTab === 1 && <ComparisonTab />}
    </Box>
  );
};

export default WholesalerComparisonModule;
