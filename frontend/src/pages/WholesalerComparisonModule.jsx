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
} from '@mui/material';
import {
  CloudUpload as ImportIcon,
  Add as AddIcon,
  Compare as CompareIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FileDownload as ExportIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  useGetWholesalerSellersQuery,
  useCreateWholesalerSellerMutation,
  useImportWholesalerPricesMutation,
  useGetWholesalerPricesQuery,
  useGetWholesalerHistoryQuery,
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

  const [sellerId, setSellerId] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
  const [rawText, setRawText] = useState('');

  // Seller Modal
  const [sellerModalOpen, setSellerModalOpen] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');

  // Result Summary Modal
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
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

          <Grid item xs={12} md={3}>
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

          <Grid item xs={12} md={4}>
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
              placeholder={`Paste raw WhatsApp text here, example:\nApple iPhone 16 128GB Black - 62500\nApple iPhone 16 256GB White - 70500\nSamsung S25 256GB Silver - 58900\nVivo V60 128GB Blue - 29900`}
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

      {/* Import Result Summary Dialog */}
      <Dialog open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white' }}>
          Import Result Summary
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="success">
              <strong>Imported Successfully:</strong> {importResult?.importedCount || 0} records
            </Alert>
            <Alert severity={importResult?.skippedCount > 0 ? 'warning' : 'info'}>
              <strong>Skipped Records:</strong> {importResult?.skippedCount || 0} records
            </Alert>

            {importResult?.skippedLines && importResult.skippedLines.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Skipped Lines Detail:
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
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
  const [sortBy, setSortBy] = useState('phoneName');
  const [sortOrder, setSortOrder] = useState('asc');

  const { data: responseData, isLoading, refetch } = useGetWholesalerPricesQuery({
    search,
    brand,
    color,
    variant,
    sellerId,
    importDate,
    page,
    limit: 50,
    sortBy,
    sortOrder,
  });

  const { data: sellersData } = useGetWholesalerSellersQuery();
  const sellers = sellersData?.data || [];

  const comparisonData = responseData?.data || { sellers: [], rows: [], pagination: {} };
  const dynamicSellers = comparisonData.sellers || [];
  const rows = comparisonData.rows || [];

  const handleResetFilters = () => {
    setSearch('');
    setBrand('');
    setColor('');
    setVariant('');
    setSellerId('');
    setImportDate('');
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!rows.length) return;
    const headers = ['Phone / Model', 'Variant', ...dynamicSellers.map((s) => s.name), 'Price Diff'];
    const csvRows = [headers.join(',')];

    rows.forEach((row) => {
      const sellerPricesMap = new Map();
      row.prices.forEach((p) => sellerPricesMap.set(p.sellerId.toString(), p.price));

      const line = [
        `"${row.phoneName}"`,
        `"${row.variant}"`,
        ...dynamicSellers.map((s) => sellerPricesMap.get(s._id.toString()) || '-'),
        row.priceDiff || 0,
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
      {/* Filters Toolbar */}
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search phone, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
              onChange={(e) => setBrand(e.target.value)}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              size="small"
              fullWidth
              label="Variant"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            />
          </Grid>

          <Grid item xs={6} md={2}>
            <TextField
              size="small"
              fullWidth
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Grid>

          <Grid item xs={6} md={3}>
            <TextField
              type="date"
              size="small"
              fullWidth
              label="Import Date"
              value={importDate}
              onChange={(e) => setImportDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
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
                {dynamicSellers.map((s) => (
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
                  <TableCell colSpan={3 + dynamicSellers.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + dynamicSellers.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No wholesaler price comparison records found. Import price lists first.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => {
                  const sellerPricesMap = new Map();
                  row.prices.forEach((p) => sellerPricesMap.set(p.sellerId.toString(), p.price));

                  const minPrice = row.minPrice;
                  const priceDiff = row.priceDiff || 0;

                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 9 }}>
                        {row.phoneName}
                      </TableCell>
                      <TableCell sx={{ position: 'sticky', left: 200, bgcolor: 'background.paper', zIndex: 9, fontWeight: 600, color: 'text.secondary' }}>
                        {row.variant || '-'}
                      </TableCell>

                      {dynamicSellers.map((s) => {
                        const priceVal = sellerPricesMap.get(s._id.toString());
                        const isLowest = priceVal && priceVal === minPrice && row.prices.length > 1;

                        return (
                          <TableCell
                            key={s._id}
                            align="center"
                            onClick={() => onSelectHistory({ phoneName: row.phoneName, model: row.model, variant: row.variant, color: row.color, sellerId: s._id })}
                            sx={{
                              cursor: 'pointer',
                              fontWeight: isLowest ? 800 : 400,
                              bgcolor: isLowest ? '#e8f5e9' : 'inherit',
                              color: isLowest ? '#2e7d32' : 'inherit',
                              '&:hover': { bgcolor: '#c8e6c9' },
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

        {/* Pagination */}
        {comparisonData.pagination?.pages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={comparisonData.pagination.pages}
              page={page}
              onChange={(e, val) => setPage(val)}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};

// ==========================================
// 3. PRICE HISTORY TAB / MODAL
// ==========================================
const HistoryTab = ({ selectedParams, onClearSelected }) => {
  const [phoneName, setPhoneName] = useState(selectedParams?.phoneName || '');
  const [model, setModel] = useState(selectedParams?.model || '');
  const [variant, setVariant] = useState(selectedParams?.variant || '');
  const [color, setColor] = useState(selectedParams?.color || '');

  React.useEffect(() => {
    if (selectedParams) {
      setPhoneName(selectedParams.phoneName || '');
      setModel(selectedParams.model || '');
      setVariant(selectedParams.variant || '');
      setColor(selectedParams.color || '');
    }
  }, [selectedParams]);

  const { data: historyData, isLoading } = useGetWholesalerHistoryQuery(
    { phoneName, model, variant, color },
    { skip: !phoneName }
  );

  const history = historyData?.data || [];

  return (
    <Box sx={{ mt: 2 }}>
      <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              size="small"
              fullWidth
              label="Phone Name"
              value={phoneName}
              onChange={(e) => setPhoneName(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              size="small"
              fullWidth
              label="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              size="small"
              fullWidth
              label="Variant"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              size="small"
              fullWidth
              label="Color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Grid>
        </Grid>
      </Card>

      <Card variant="outlined">
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Import Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Seller Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Variant & Color</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Price</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    {phoneName ? 'No historical price records found for this product.' : 'Enter a phone name to view price history.'}
                  </TableCell>
                </TableRow>
              ) : (
                history.map((h, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{new Date(h.importDate || h.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{h.seller?.name || h.sellerName}</TableCell>
                    <TableCell>{h.phoneName} {h.model}</TableCell>
                    <TableCell>{h.variant} {h.color}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {formatCurrency(h.price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

// ==========================================
// MAIN WHOLESALER COMPARISON MODULE PAGE
// ==========================================
const WholesalerComparisonModule = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [historyParams, setHistoryParams] = useState(null);

  const handleSelectHistory = (params) => {
    setHistoryParams(params);
    setActiveTab(2); // Switch to Price History tab
  };

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
          <Tab icon={<HistoryIcon />} iconPosition="start" label="3. Price History" />
        </Tabs>
      </Card>

      {activeTab === 0 && <ImportTab />}
      {activeTab === 1 && <ComparisonTab onSelectHistory={handleSelectHistory} />}
      {activeTab === 2 && <HistoryTab selectedParams={historyParams} onClearSelected={() => setHistoryParams(null)} />}
    </Box>
  );
};

export default WholesalerComparisonModule;
