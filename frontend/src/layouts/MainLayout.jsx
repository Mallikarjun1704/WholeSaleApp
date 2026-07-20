import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  Badge,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  LocalShipping as SupplierIcon,
  CreditCard as CreditIcon,
  Assessment as ReportsIcon,
  AccountBalanceWallet as ExpenseIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  QrCodeScanner as BarcodeIcon,
  ExpandLess,
  ExpandMore,
  PhoneAndroid as PhoneIcon,
  AdminPanelSettings as AdminIcon,
  History as ActivityLogIcon,
} from '@mui/icons-material';
import { useLogoutMutation } from '../api/authApi';
import { logout as logoutAction, selectCurrentUser, selectIsAdmin } from '../features/auth/authSlice';
import { toggleTheme, toggleSidebar, selectThemeMode, selectSidebarOpen } from '../features/theme/themeSlice';

const DRAWER_WIDTH = 270;
const DRAWER_COLLAPSED_WIDTH = 72;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAdmin = useSelector(selectIsAdmin);
  const themeMode = useSelector(selectThemeMode);
  const sidebarOpen = useSelector(selectSidebarOpen);

  const [logoutApi] = useLogoutMutation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch (e) {
      // Logout locally even if API fails
    }
    dispatch(logoutAction());
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
    { text: 'Billing', icon: <ReceiptIcon />, path: '/billing' },
    { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
    { text: 'Suppliers', icon: <SupplierIcon />, path: '/suppliers' },
    { text: 'Credits', icon: <CreditIcon />, path: '/credits' },
    { text: 'Reports', icon: <ReportsIcon />, path: '/reports', adminOnly: true },
    { text: 'Expenses', icon: <ExpenseIcon />, path: '/expenses', adminOnly: true },
  ];

  const settingsItems = [
    { text: 'Shop Settings', path: '/settings/shop' },
    { text: 'User Management', path: '/settings/users' },
    { text: 'GST Settings', path: '/settings/gst' },
    { text: 'Printer Settings', path: '/settings/printer' },
    { text: 'Invoice Settings', path: '/settings/invoice' },
    { text: 'Backup & Restore', path: '/settings/backup' },
    { text: 'Activity Logs', path: '/settings/activity-logs' },
  ];

  const isActivePath = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
          flexShrink: 0,
          transition: 'width 0.3s ease',
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            px: sidebarOpen ? 2.5 : 0,
            py: 2,
            minHeight: 64,
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #0EA5E9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PhoneIcon sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          {sidebarOpen && (
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  lineHeight: 1.2,
                }}
              >
                TECH MART
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                Wholesale Mobile Store
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mx: 1, opacity: 0.5 }} />

        {/* Navigation */}
        <List sx={{ flex: 1, pt: 1 }}>
          {menuItems.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            return (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!sidebarOpen ? item.text : ''} placement="right" arrow>
                  <ListItemButton
                    selected={isActivePath(item.path)}
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: 44,
                      justifyContent: sidebarOpen ? 'initial' : 'center',
                      px: 2,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarOpen ? 2 : 'auto',
                        justifyContent: 'center',
                        color: isActivePath(item.path) ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {sidebarOpen && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}

          {/* Settings (Admin only) */}
          {isAdmin && (
            <>
              <ListItem disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!sidebarOpen ? 'Settings' : ''} placement="right" arrow>
                  <ListItemButton
                    onClick={() => {
                      if (sidebarOpen) {
                        setSettingsOpen(!settingsOpen);
                      } else {
                        navigate('/settings/shop');
                      }
                    }}
                    sx={{
                      minHeight: 44,
                      justifyContent: sidebarOpen ? 'initial' : 'center',
                      px: 2,
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: sidebarOpen ? 2 : 'auto',
                        justifyContent: 'center',
                        color: location.pathname.startsWith('/settings')
                          ? 'primary.main'
                          : 'text.secondary',
                      }}
                    >
                      <SettingsIcon />
                    </ListItemIcon>
                    {sidebarOpen && (
                      <>
                        <ListItemText primary="Settings" />
                        {settingsOpen ? <ExpandLess /> : <ExpandMore />}
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
              {sidebarOpen && (
                <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {settingsItems.map((item) => (
                      <ListItemButton
                        key={item.text}
                        selected={location.pathname === item.path}
                        onClick={() => navigate(item.path)}
                        sx={{ pl: 6, py: 0.75, minHeight: 36 }}
                      >
                        <ListItemText
                          primary={item.text}
                          primaryTypographyProps={{ fontSize: '0.85rem' }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              )}
            </>
          )}
        </List>

        {/* User Card at bottom */}
        {sidebarOpen && (
          <Box
            sx={{
              p: 2,
              m: 1.5,
              borderRadius: 3,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
              border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                {user?.fullName?.[0] || 'A'}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user?.fullName || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {user?.role || 'staff'}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top App Bar */}
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton
              onClick={() => dispatch(toggleSidebar())}
              edge="start"
              id="toggle-sidebar-btn"
            >
              {sidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>

            <Typography variant="h6" noWrap sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {menuItems.find((item) => isActivePath(item.path))?.text ||
                (location.pathname.startsWith('/settings') ? 'Settings' : 'TECH MART')}
            </Typography>

            <Box sx={{ flex: 1 }} />

            {/* Search */}
            <Tooltip title="Search (Ctrl+K)">
              <IconButton id="global-search-btn">
                <SearchIcon />
              </IconButton>
            </Tooltip>

            {/* Barcode Scanner */}
            <Tooltip title="Scan Barcode">
              <IconButton id="barcode-scan-btn">
                <BarcodeIcon />
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton id="notifications-btn">
                <Badge badgeContent={0} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton onClick={() => dispatch(toggleTheme())} id="theme-toggle-btn">
                {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                id="user-menu-btn"
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    background: 'linear-gradient(135deg, #6366F1, #0EA5E9)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {user?.fullName?.[0] || 'A'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 2,
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email || user?.username}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                Profile
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings/shop'); }}>
                  <ListItemIcon><AdminIcon fontSize="small" /></ListItemIcon>
                  Admin Panel
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: 3,
            backgroundColor: (theme) => theme.palette.background.default,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
