import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  alpha,
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart as SalesIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  CreditCard as CreditIcon,
  AccountBalanceWallet as StockValueIcon,
  Warning as LowStockIcon,
  CalendarMonth as MonthlyIcon,
  ShowChart as MonthlyProfitIcon,
  LocalShipping as PurchaseIcon,
  Category as CategoryIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Payment as PaymentIcon,
  Undo as RefundIcon,
  Cancel as CancelIcon,
  Backup as BackupIcon,
  Settings as SettingsIcon,
  Error as AlertIcon,
  Close as CloseIcon,
  MonetizationOn as CommissionIcon,
  DirectionsCar as TravelIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  useGetDashboardStatsQuery,
  useGetDashboardChartsQuery,
  useGetRecentActivitiesQuery,
  useGetDashboardDetailsQuery,
} from '../api/dashboardApi';

dayjs.extend(relativeTime);

// Currency Formatter Helper
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, gradient, isLoading, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: onClick ? 'translateY(-6px) scale(1.02)' : 'translateY(-6px)',
        boxShadow: (theme) => `0 12px 30px ${alpha(color || theme.palette.primary.main, 0.25)}`,
      },
    }}
  >
    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </Typography>
          {isLoading ? (
            <Skeleton variant="text" width="70%" height={40} sx={{ mt: 0.5 }} />
          ) : (
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: gradient || `linear-gradient(135deg, ${color}, ${alpha(color, 0.7)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
            flexShrink: 0,
            ml: 2,
          }}
        >
          {React.cloneElement(icon, { sx: { fontSize: 24, color: '#fff' } })}
        </Box>
      </Box>
    </CardContent>
    {/* Decorative gradient line */}
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        background: gradient || `linear-gradient(90deg, ${color}, ${alpha(color, 0.3)})`,
      }}
    />
  </Card>
);

const getActivityConfig = (action) => {
  switch (action) {
    case 'CREATE':
      return { icon: <AddIcon />, color: '#10B981', bgColor: alpha('#10B981', 0.1) };
    case 'UPDATE':
    case 'PRICE_CHANGE':
    case 'STOCK_ADJUSTMENT':
      return { icon: <EditIcon />, color: '#F59E0B', bgColor: alpha('#F59E0B', 0.1) };
    case 'DELETE':
      return { icon: <DeleteIcon />, color: '#EF4444', bgColor: alpha('#EF4444', 0.1) };
    case 'LOGIN':
      return { icon: <LoginIcon />, color: '#6366F1', bgColor: alpha('#6366F1', 0.1) };
    case 'LOGOUT':
      return { icon: <LogoutIcon />, color: '#64748B', bgColor: alpha('#64748B', 0.1) };
    case 'SALE':
      return { icon: <SalesIcon />, color: '#0EA5E9', bgColor: alpha('#0EA5E9', 0.1) };
    case 'PURCHASE':
      return { icon: <PurchaseIcon />, color: '#F59E0B', bgColor: alpha('#F59E0B', 0.1) };
    case 'PAYMENT':
      return { icon: <PaymentIcon />, color: '#10B981', bgColor: alpha('#10B981', 0.1) };
    case 'REFUND':
      return { icon: <RefundIcon />, color: '#EC4899', bgColor: alpha('#EC4899', 0.1) };
    case 'CANCEL':
      return { icon: <CancelIcon />, color: '#EF4444', bgColor: alpha('#EF4444', 0.1) };
    case 'BACKUP':
    case 'RESTORE':
      return { icon: <BackupIcon />, color: '#8B5CF6', bgColor: alpha('#8B5CF6', 0.1) };
    case 'SETTINGS_UPDATE':
      return { icon: <SettingsIcon />, color: '#64748B', bgColor: alpha('#64748B', 0.1) };
    default:
      return { icon: <AlertIcon />, color: '#6366F1', bgColor: alpha('#6366F1', 0.1) };
  }
};

// Popup Modal Component for Card Details
const DashboardDetailModal = ({ open, onClose, detailType, title }) => {
  const { data, isLoading } = useGetDashboardDetailsQuery(detailType, { skip: !open || !detailType });
  const items = data?.data || [];

  const totalStockQty = items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const totalPurchaseAmount = items.reduce(
    (sum, item) => sum + (Number(item.totalPurchasePrice) || ((Number(item.stock) || 0) * (Number(item.purchasePrice) || 0)) || 0),
    0
  );

  const isLossType = ['totalLoss', 'todayLoss', 'monthlyLoss'].includes(detailType);
  const totalLossAmount = isLossType ? items.reduce((sum, item) => sum + (Number(item.totalLoss) || 0), 0) : 0;
  const totalLossQty = isLossType ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {title || 'Details'}
          </Typography>
          {detailType === 'totalQuantity' && items.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} alignItems="center">
              <Chip
                label={`Total Purchase Amount: ${formatCurrency(totalPurchaseAmount)}`}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Total Quantity: <strong>{totalStockQty} Units</strong>
              </Typography>
            </Stack>
          )}
          {isLossType && items.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} alignItems="center">
              <Chip
                label={`Total Loss: ${formatCurrency(totalLossAmount)}`}
                color="error"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Total Loss Qty: <strong>{totalLossQty} Units</strong>
              </Typography>
            </Stack>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 2, minHeight: 300 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <Typography variant="body1" color="text.secondary">
              No detail records found.
            </Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  {detailType === 'pendingCollections' && (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>Shop Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Phone Number</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Outstanding Amount</TableCell>
                    </>
                  )}
                  {detailType === 'totalQuantity' && (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Stock Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Purchase Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Purchase Amount</TableCell>
                    </>
                  )}
                  {isLossType && (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>Product ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Purchase Price</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Sale Price</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Loss Qty</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Total Loss</TableCell>
                    </>
                  )}
                  {(detailType === 'totalProducts' || detailType === 'totalQuantitySold') && (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        {detailType === 'totalQuantitySold' ? 'Sold Qty' : 'Stock Qty'}
                      </TableCell>
                    </>
                  )}
                  {detailType === 'lowStockItems' && (
                    <>
                      <TableCell sx={{ fontWeight: 700 }}>Product Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Stock Qty</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Low Stock Threshold</TableCell>
                    </>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((row, idx) => (
                  <TableRow key={row._id || row.id || idx} hover>
                    {detailType === 'pendingCollections' && (
                      <>
                        <TableCell><strong>{row.storeName}</strong></TableCell>
                        <TableCell>{row.phoneNumber}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                          {formatCurrency(row.totalOutstanding)}
                        </TableCell>
                      </>
                    )}
                    {detailType === 'totalQuantity' && (
                      <>
                        <TableCell><strong>{row.name || 'Unknown Product'}</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {row.stock}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(row.purchasePrice || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          {formatCurrency(row.totalPurchasePrice || (row.stock * (row.purchasePrice || 0)))}
                        </TableCell>
                      </>
                    )}
                    {isLossType && (
                      <>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          <Chip
                            label={row.productId || row.sku || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <strong>{row.name || 'Unknown Product'}</strong>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(row.purchasePrice || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          {formatCurrency(row.salePrice || 0)}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {row.quantity}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: 'error.main' }}>
                          {formatCurrency(row.totalLoss || 0)}
                        </TableCell>
                      </>
                    )}
                    {(detailType === 'totalProducts' || detailType === 'totalQuantitySold') && (
                      <>
                        <TableCell><strong>{row.name || 'Unknown Product'}</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {row.stock}
                        </TableCell>
                      </>
                    )}
                    {detailType === 'lowStockItems' && (
                      <>
                        <TableCell><strong>{row.name}</strong></TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: 'error.main' }}>
                          {row.stock}
                        </TableCell>
                        <TableCell align="center">
                          {row.lowStockThreshold || 5}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
                {detailType === 'totalQuantity' && items.length > 0 && (
                  <TableRow sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'divider' }}>
                    <TableCell><strong>Total</strong></TableCell>
                    <TableCell align="center"><strong>{totalStockQty}</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'primary.main' }}>
                      {formatCurrency(totalPurchaseAmount)}
                    </TableCell>
                  </TableRow>
                )}
                {isLossType && items.length > 0 && (
                  <TableRow sx={{ bgcolor: 'action.hover', borderTop: '2px solid', borderColor: 'divider' }}>
                    <TableCell colSpan={2}><strong>Total</strong></TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="right">-</TableCell>
                    <TableCell align="center"><strong>{totalLossQty}</strong></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: 'error.main' }}>
                      {formatCurrency(totalLossAmount)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ========== Amount in Hand Breakdown Dialog ==========
const AmountInHandBreakdownDialog = ({ open, onClose, stats }) => {
  const investments = stats.totalInvestments || 0;
  const paidSales = stats.totalPaidSales || 0;
  const paidPurchases = stats.totalPaidPurchases || 0;
  const expenses = stats.totalExpenses || 0;
  const cashInHand = stats.cashInHand || 0;

  const rows = [
    { label: 'Partner Investments (Net Capital)', value: investments, sign: '+', color: '#10B981' },
    { label: 'Total Paid Sales (Money Received from Shops)', value: paidSales, sign: '+', color: '#0EA5E9' },
    { label: 'Total Paid Purchases (Money Paid to Suppliers)', value: paidPurchases, sign: '−', color: '#EF4444' },
    { label: 'Total Expenses (Rent, Salaries, etc.)', value: expenses, sign: '−', color: '#F59E0B' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Amount in Hand — Breakdown</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 0 }}>
        {/* Formula banner */}
        <Box sx={{ px: 3, py: 2, bgcolor: alpha('#10B981', 0.06) }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>Formula:</Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
            Amount in Hand = Investments + Paid Sales − Paid Purchases − Expenses
          </Typography>
        </Box>
        <Divider />

        {/* Breakdown rows */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack spacing={1.5}>
            {rows.map((row, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, px: 2, borderRadius: 2, bgcolor: alpha(row.color, 0.05), border: `1px solid ${alpha(row.color, 0.15)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip label={row.sign} size="small" sx={{ fontWeight: 800, fontSize: '1rem', bgcolor: alpha(row.color, 0.15), color: row.color, minWidth: 32 }} />
                  <Typography variant="body2" fontWeight={600}>{row.label}</Typography>
                </Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: row.color, fontFamily: 'monospace' }}>
                  {formatCurrency(row.value)}
                </Typography>
              </Box>
            ))}
          </Stack>

          {/* Divider line */}
          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

          {/* Grand Total */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, px: 2.5, borderRadius: 2, bgcolor: cashInHand >= 0 ? alpha('#10B981', 0.1) : alpha('#EF4444', 0.1), border: `2px solid ${cashInHand >= 0 ? '#10B981' : '#EF4444'}` }}>
            <Typography variant="subtitle1" fontWeight={800}>= Amount in Hand</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: cashInHand >= 0 ? '#10B981' : '#EF4444', fontFamily: 'monospace' }}>
              {formatCurrency(cashInHand)}
            </Typography>
          </Box>

          {/* Cross-check */}
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              Cross-check: {formatCurrency(investments)} + {formatCurrency(paidSales)} − {formatCurrency(paidPurchases)} − {formatCurrency(expenses)} = <strong>{formatCurrency(investments + paidSales - paidPurchases - expenses)}</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

const Dashboard = () => {
  const { data: statsData, isLoading: statsLoading } = useGetDashboardStatsQuery();
  const { data: chartsData, isLoading: chartsLoading } = useGetDashboardChartsQuery();
  const { data: activitiesData, isLoading: activitiesLoading } = useGetRecentActivitiesQuery();

  const [activeModal, setActiveModal] = useState({ open: false, type: '', title: '' });
  const [cashBreakdownOpen, setCashBreakdownOpen] = useState(false);

  const handleOpenModal = (type, title) => {
    if (type) {
      setActiveModal({ open: true, type, title });
    }
  };

  const handleCloseModal = () => {
    setActiveModal({ open: false, type: '', title: '' });
  };

  const stats = statsData?.data || {};
  const charts = chartsData?.data || [];
  const activities = activitiesData?.data || [];

  const statCardsData = [
    { title: 'Amount in Hand', value: formatCurrency(stats.cashInHand), icon: <StockValueIcon />, color: '#10B981', customClick: () => setCashBreakdownOpen(true) },
    { title: 'Expense', value: formatCurrency(stats.totalExpenses), icon: <LossIcon />, color: '#EF4444' },
    {
      title: 'Outstanding',
      value: formatCurrency(stats.pendingCollection),
      icon: <CreditIcon />,
      color: '#F59E0B',
      detailType: 'pendingCollections',
      modalTitle: 'Pending Collections Details',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts || 0,
      icon: <InventoryIcon />,
      color: '#6366F1',
      detailType: 'totalProducts',
      modalTitle: 'Active Products',
    },
    {
      title: 'Total Quantity',
      value: stats.totalQuantity || 0,
      icon: <CategoryIcon />,
      color: '#8B5CF6',
      detailType: 'totalQuantity',
      modalTitle: 'Stock Quantity Breakdown',
    },
    {
      title: 'Total Quantity Sold',
      value: stats.totalQuantitySold || 0,
      icon: <SalesIcon />,
      color: '#EC4899',
      detailType: 'totalQuantitySold',
      modalTitle: 'Total Quantity Sold Breakdown',
    },
    { title: 'Total Sales', value: formatCurrency(stats.totalSales), icon: <SalesIcon />, color: '#0EA5E9' },
    { title: 'Total Profit', value: formatCurrency(stats.totalProfit), icon: <ProfitIcon />, color: '#10B981' },
    {
      title: 'Total Loss',
      value: formatCurrency(stats.totalLoss),
      icon: <LossIcon />,
      color: '#EF4444',
      detailType: 'totalLoss',
      modalTitle: 'Total Loss Breakdown by Product',
    },
    { title: 'Total Purchase', value: formatCurrency(stats.totalPurchase), icon: <PurchaseIcon />, color: '#F59E0B' },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems || 0,
      icon: <LowStockIcon />,
      color: '#F59E0B',
      detailType: 'lowStockItems',
      modalTitle: 'Low Stock Items Alert',
    },
    { title: 'Total Commission', value: formatCurrency(stats.totalCommission), icon: <CommissionIcon />, color: '#10B981' },
    { title: 'Total Travel Charge', value: formatCurrency(stats.totalTravelCharge), icon: <TravelIcon />, color: '#F59E0B' },
    { title: 'Monthly Profit', value: formatCurrency(stats.monthlyProfit), icon: <MonthlyProfitIcon />, color: '#10B981' },
    {
      title: 'Monthly Loss',
      value: formatCurrency(stats.monthlyLoss),
      icon: <LossIcon />,
      color: '#EF4444',
      detailType: 'monthlyLoss',
      modalTitle: 'Monthly Loss Breakdown by Product',
    },
    { title: 'Monthly Sales', value: formatCurrency(stats.monthlySales), icon: <MonthlyIcon />, color: '#0EA5E9' },
    { title: 'Monthly Purchase', value: formatCurrency(stats.monthlyPurchase), icon: <PurchaseIcon />, color: '#8B5CF6' },
    { title: 'Current Month Volume', value: stats.monthlyVolume || 0, icon: <CategoryIcon />, color: '#EC4899' },
    { title: 'Current Month Commission', value: formatCurrency(stats.monthlyCommission), icon: <CommissionIcon />, color: '#0EA5E9' },
    { title: 'Current Month Travel Charge', value: formatCurrency(stats.monthlyTravelCharge), icon: <TravelIcon />, color: '#6366F1' },
    { title: "Today's Profit", value: formatCurrency(stats.todayProfit), icon: <ProfitIcon />, color: '#10B981' },
    {
      title: "Today's Loss",
      value: formatCurrency(stats.todayLoss),
      icon: <LossIcon />,
      color: '#EF4444',
      detailType: 'todayLoss',
      modalTitle: "Today's Loss Breakdown by Product",
    },
  ];

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome back! Here's what's happening with your store today.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={2.5}>
        {statCardsData.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={index}>
            <StatCard
              {...stat}
              isLoading={statsLoading}
              onClick={stat.customClick || (stat.detailType ? () => handleOpenModal(stat.detailType, stat.modalTitle) : undefined)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts & Activities Section */}
      <Grid container spacing={2.5} sx={{ mt: 1 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Sales Overview (Last 30 Days)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Compare your wholesale sales, purchases, and profits.
            </Typography>

            {chartsLoading ? (
              <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 2 }} />
            ) : charts && charts.length > 0 ? (
              <Box sx={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={charts}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip
                      formatter={(val) => [formatCurrency(val), '']}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                    <Area type="monotone" dataKey="purchase" name="Purchase" stroke="#F59E0B" fillOpacity={1} fill="url(#colorPurchase)" strokeWidth={2} />
                    <Area type="monotone" dataKey="profit" name="Profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <Typography color="text.secondary">No chart data available</Typography>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Latest actions across your application.
            </Typography>

            {activitiesLoading ? (
              <Box>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} height={60} sx={{ my: 1 }} />
                ))}
              </Box>
            ) : activities && activities.length > 0 ? (
              <List sx={{ width: '100%', padding: 0 }}>
                {activities.map((act, idx) => {
                  const config = getActivityConfig(act.action);
                  return (
                    <React.Fragment key={act._id || idx}>
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                        <ListItemAvatar sx={{ minWidth: 48 }}>
                          <Avatar sx={{ bgcolor: config.bgColor, color: config.color, width: 36, height: 36 }}>
                            {config.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {act.details || act.action}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {act.userId?.fullName ? `${act.userId.fullName} • ` : ''}
                              {dayjs(act.createdAt).fromNow()}
                            </Typography>
                          }
                        />
                      </ListItem>
                      {idx < activities.length - 1 && <Divider component="li" light />}
                    </React.Fragment>
                  );
                })}
              </List>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                <Typography color="text.secondary">No recent activities</Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Detail Modal Dialog */}
      <DashboardDetailModal
        open={activeModal.open}
        onClose={handleCloseModal}
        detailType={activeModal.type}
        title={activeModal.title}
      />

      {/* Amount in Hand Breakdown Dialog */}
      <AmountInHandBreakdownDialog
        open={cashBreakdownOpen}
        onClose={() => setCashBreakdownOpen(false)}
        stats={stats}
      />
    </Box>
  );
};

export default Dashboard;
