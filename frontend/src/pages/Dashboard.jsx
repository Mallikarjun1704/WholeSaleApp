import React from 'react';
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
  Chip,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart as SalesIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  CreditCard as CreditIcon,
  People as CustomerIcon,
  AccountBalanceWallet as StockValueIcon,
  Warning as LowStockIcon,
  RemoveShoppingCart as OutOfStockIcon,
  Receipt as BillIcon,
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
const StatCard = ({ title, value, icon, color, gradient, isLoading }) => (
  <Card
    sx={{
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '&:hover': {
        transform: 'translateY(-6px)',
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

const Dashboard = () => {
  const { data: statsData, isLoading: statsLoading } = useGetDashboardStatsQuery();
  const { data: chartsData, isLoading: chartsLoading } = useGetDashboardChartsQuery();
  const { data: activitiesData, isLoading: activitiesLoading } = useGetRecentActivitiesQuery();

  const stats = statsData?.data || {};
  const charts = chartsData?.data || [];
  const activities = activitiesData?.data || [];

  const statCardsData = [
    { title: 'Total Products', value: stats.totalProducts || 0, icon: <InventoryIcon />, color: '#6366F1' },
    { title: 'Total Quantity', value: stats.totalQuantity || 0, icon: <CategoryIcon />, color: '#8B5CF6' },
    { title: "Today's Sales", value: formatCurrency(stats.todaySales), icon: <SalesIcon />, color: '#0EA5E9' },
    { title: "Today's Purchase", value: formatCurrency(stats.todayPurchase), icon: <PurchaseIcon />, color: '#F59E0B' },
    { title: "Today's Profit", value: formatCurrency(stats.todayProfit), icon: <ProfitIcon />, color: '#10B981' },
    { title: "Today's Loss", value: formatCurrency(stats.todayLoss), icon: <LossIcon />, color: '#EF4444' },
    { title: 'Pending Credit', value: formatCurrency(stats.pendingCredit), icon: <CreditIcon />, color: '#F97316' },
    { title: 'Pending Customers', value: stats.pendingCustomers || 0, icon: <CustomerIcon />, color: '#EC4899' },
    { title: 'Stock Value', value: formatCurrency(stats.stockValue), icon: <StockValueIcon />, color: '#14B8A6' },
    { title: 'Low Stock Items', value: stats.lowStockItems || 0, icon: <LowStockIcon />, color: '#F59E0B' },
    { title: 'Out of Stock', value: stats.outOfStock || 0, icon: <OutOfStockIcon />, color: '#EF4444' },
    { title: "Today's Bills", value: stats.todayBills || 0, icon: <BillIcon />, color: '#6366F1' },
    { title: 'Monthly Sales', value: formatCurrency(stats.monthlySales), icon: <MonthlyIcon />, color: '#0EA5E9' },
    { title: 'Monthly Profit', value: formatCurrency(stats.monthlyProfit), icon: <MonthlyProfitIcon />, color: '#10B981' },
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
            <StatCard {...stat} isLoading={statsLoading} />
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
                        <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha('#94A3B8', 0.1)} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        borderColor: alpha('#64748B', 0.2),
                        borderRadius: 8,
                        color: '#F1F5F9',
                      }}
                      formatter={(value) => [`₹${value.toLocaleString('en-IN')}`]}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="#0EA5E9"
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="purchase"
                      name="Purchase"
                      stroke="#F59E0B"
                      fillOpacity={1}
                      fill="url(#colorPurchase)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 300,
                  borderRadius: 2,
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography color="text.secondary">No chart data available yet</Typography>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Track latest adjustments and changes in the store.
            </Typography>

            {activitiesLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="text" width="40%" height={15} />
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : activities && activities.length > 0 ? (
              <List sx={{ p: 0, flexGrow: 1, overflowY: 'auto', maxHeight: 350 }}>
                {activities.map((activity, index) => {
                  const config = getActivityConfig(activity.action);
                  const userDetail = activity.userId 
                    ? `${activity.userId.fullName} (${activity.userId.role})` 
                    : activity.userName || 'System';

                  return (
                    <React.Fragment key={activity._id || index}>
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: config.bgColor, color: config.color, borderRadius: '10px' }}>
                            {config.icon}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                {activity.description || `${activity.action} ${activity.resource}`}
                              </Typography>
                              <Chip
                                label={activity.action}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  height: 18,
                                  bgcolor: config.bgColor,
                                  color: config.color,
                                  border: `1px solid ${alpha(config.color, 0.3)}`,
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                By {userDetail}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(activity.createdAt).fromNow()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < activities.length - 1 && <Divider variant="inset" component="li" sx={{ ml: 7, borderColor: alpha('#64748B', 0.1) }} />}
                    </React.Fragment>
                  );
                })}
              </List>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexGrow: 1,
                  minHeight: 250,
                  borderRadius: 2,
                  backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05),
                  border: (theme) => `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography color="text.secondary">No recent activities logged</Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
