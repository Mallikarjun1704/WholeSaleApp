import { createTheme, alpha } from '@mui/material/styles';

// Premium color palette
const palette = {
  primary: {
    main: '#6366F1',     // Indigo
    light: '#818CF8',
    dark: '#4F46E5',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#0EA5E9',     // Sky blue
    light: '#38BDF8',
    dark: '#0284C7',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
  },
  info: {
    main: '#6366F1',
    light: '#818CF8',
    dark: '#4F46E5',
  },
};

// Create dark theme
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...palette,
    background: {
      default: '#0F172A',    // Slate 900
      paper: '#1E293B',      // Slate 800
    },
    text: {
      primary: '#F1F5F9',    // Slate 100
      secondary: '#94A3B8',  // Slate 400
    },
    divider: alpha('#94A3B8', 0.12),
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      fontSize: '2.5rem',
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '0.95rem',
    },
    body1: {
      fontSize: '0.9rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.85rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.3)',
    '0 1px 3px rgba(0,0,0,0.4)',
    '0 2px 6px rgba(0,0,0,0.4)',
    '0 4px 8px rgba(0,0,0,0.4)',
    '0 6px 12px rgba(0,0,0,0.35)',
    '0 8px 16px rgba(0,0,0,0.35)',
    '0 10px 20px rgba(0,0,0,0.3)',
    '0 12px 24px rgba(0,0,0,0.3)',
    '0 14px 28px rgba(0,0,0,0.3)',
    '0 16px 32px rgba(0,0,0,0.25)',
    '0 18px 36px rgba(0,0,0,0.25)',
    '0 20px 40px rgba(0,0,0,0.25)',
    ...Array(12).fill('0 20px 40px rgba(0,0,0,0.25)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 transparent',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#475569',
            borderRadius: '4px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
          },
        },
        outlined: {
          borderColor: alpha('#6366F1', 0.5),
          '&:hover': {
            borderColor: '#6366F1',
            backgroundColor: alpha('#6366F1', 0.08),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#94A3B8', 0.08)}`,
          backgroundImage: 'none',
          backgroundColor: alpha('#1E293B', 0.8),
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': {
              borderColor: alpha('#94A3B8', 0.2),
            },
            '&:hover fieldset': {
              borderColor: alpha('#6366F1', 0.5),
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: alpha('#94A3B8', 0.08),
        },
        head: {
          fontWeight: 600,
          backgroundColor: alpha('#1E293B', 0.6),
          color: '#94A3B8',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          backgroundColor: '#0F172A',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: alpha('#6366F1', 0.15),
            color: '#818CF8',
            '&:hover': {
              backgroundColor: alpha('#6366F1', 0.2),
            },
            '& .MuiListItemIcon-root': {
              color: '#818CF8',
            },
          },
          '&:hover': {
            backgroundColor: alpha('#94A3B8', 0.08),
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#0F172A', 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha('#94A3B8', 0.08)}`,
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${alpha('#94A3B8', 0.1)}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.8rem',
          backgroundColor: '#334155',
        },
      },
    },
  },
});

// Create light theme
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    ...palette,
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
    divider: alpha('#64748B', 0.12),
  },
  typography: darkTheme.typography,
  shape: darkTheme.shape,
  components: {
    ...darkTheme.components,
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#CBD5E1 transparent',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha('#64748B', 0.1)}`,
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          backgroundColor: '#FFFFFF',
          boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: alpha('#FFFFFF', 0.8),
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha('#64748B', 0.1)}`,
          boxShadow: 'none',
          color: '#1E293B',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          '&.Mui-selected': {
            backgroundColor: alpha('#6366F1', 0.1),
            color: '#4F46E5',
            '&:hover': {
              backgroundColor: alpha('#6366F1', 0.15),
            },
            '& .MuiListItemIcon-root': {
              color: '#4F46E5',
            },
          },
        },
      },
    },
  },
});
