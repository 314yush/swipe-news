"use client";

import { createTheme, ThemeOptions } from "@mui/material/styles";

// Robinhood/Coinbase inspired Color Tokens (Dark Theme)
const m3Colors = {
  // Primary colors - Bright green (optimistic, growth)
  primary: {
    main: "#00C853",
    light: "#69F0AE",
    dark: "#00B248",
    contrastText: "#FFFFFF",
  },
  // Secondary colors - Purple accent (premium features)
  secondary: {
    main: "#8B5CF6",
    light: "#A78BFA",
    dark: "#7C3AED",
    contrastText: "#FFFFFF",
  },
  // Tertiary colors
  tertiary: {
    main: "#8B5CF6",
    light: "#A78BFA",
    dark: "#7C3AED",
    contrastText: "#FFFFFF",
  },
  // Error colors - Red for short/negative
  error: {
    main: "#FF5252",
    light: "#FF8A80",
    dark: "#D32F2F",
    contrastText: "#FFFFFF",
  },
  // Success colors - Same as primary (consistency)
  success: {
    main: "#00C853",
    light: "#69F0AE",
    dark: "#00B248",
    contrastText: "#FFFFFF",
  },
  // Warning colors
  warning: {
    main: "#FFB74D",
    light: "#FFE0B2",
    dark: "#F57C00",
    contrastText: "#000000",
  },
  // Info colors
  info: {
    main: "#64B5F6",
    light: "#BBDEFB",
    dark: "#1976D2",
    contrastText: "#000000",
  },
  // Background colors
  background: {
    default: "#121212",
    paper: "#1E1E1E",
  },
  // Surface colors
  surfaceVariant: "#2A2A2A",
  surfaceContainerLow: "#181818",
  surfaceContainer: "#1E1E1E",
  surfaceContainerHigh: "#242424",
  surfaceContainerHighest: "#2E2E2E",
  // Outline colors
  outline: "#444444",
  outlineVariant: "#333333",
  // On-colors
  onSurface: "#FFFFFF",
  onSurfaceVariant: "#9E9E9E",
  onPrimary: "#FFFFFF",
  onSecondary: "#FFFFFF",
  onError: "#FFFFFF",
};

// Material 3 Typography Scale
const m3Typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  // Display styles
  displayLarge: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "3.5625rem", // 57px
    fontWeight: 400,
    lineHeight: 1.12,
    letterSpacing: "-0.25px",
  },
  displayMedium: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "2.8125rem", // 45px
    fontWeight: 400,
    lineHeight: 1.16,
    letterSpacing: "0px",
  },
  displaySmall: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "2.25rem", // 36px
    fontWeight: 400,
    lineHeight: 1.22,
    letterSpacing: "0px",
  },
  // Headline styles
  headlineLarge: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "2rem", // 32px
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: "0px",
  },
  headlineMedium: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "1.75rem", // 28px
    fontWeight: 400,
    lineHeight: 1.29,
    letterSpacing: "0px",
  },
  headlineSmall: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "1.5rem", // 24px
    fontWeight: 400,
    lineHeight: 1.33,
    letterSpacing: "0px",
  },
  // Title styles
  titleLarge: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "1.375rem", // 22px
    fontWeight: 400,
    lineHeight: 1.27,
    letterSpacing: "0px",
  },
  titleMedium: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "1rem", // 16px
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: "0.15px",
  },
  titleSmall: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.875rem", // 14px
    fontWeight: 500,
    lineHeight: 1.43,
    letterSpacing: "0.1px",
  },
  // Body styles
  bodyLarge: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "1rem", // 16px
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0.5px",
  },
  bodyMedium: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.875rem", // 14px
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: "0.25px",
  },
  bodySmall: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.75rem", // 12px
    fontWeight: 400,
    lineHeight: 1.33,
    letterSpacing: "0.4px",
  },
  // Label styles
  labelLarge: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.875rem", // 14px
    fontWeight: 500,
    lineHeight: 1.43,
    letterSpacing: "0.1px",
  },
  labelMedium: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.75rem", // 12px
    fontWeight: 500,
    lineHeight: 1.33,
    letterSpacing: "0.5px",
  },
  labelSmall: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: "0.6875rem", // 11px
    fontWeight: 500,
    lineHeight: 1.45,
    letterSpacing: "0.5px",
  },
  // MUI standard mappings
  h1: {
    fontSize: "2rem",
    fontWeight: 400,
    lineHeight: 1.25,
  },
  h2: {
    fontSize: "1.75rem",
    fontWeight: 400,
    lineHeight: 1.29,
  },
  h3: {
    fontSize: "1.5rem",
    fontWeight: 400,
    lineHeight: 1.33,
  },
  h4: {
    fontSize: "1.375rem",
    fontWeight: 400,
    lineHeight: 1.27,
  },
  h5: {
    fontSize: "1rem",
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: "0.15px",
  },
  h6: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.43,
    letterSpacing: "0.1px",
  },
  body1: {
    fontSize: "1rem",
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "0.5px",
  },
  body2: {
    fontSize: "0.875rem",
    fontWeight: 400,
    lineHeight: 1.43,
    letterSpacing: "0.25px",
  },
  button: {
    fontSize: "0.875rem",
    fontWeight: 500,
    lineHeight: 1.43,
    letterSpacing: "0.1px",
    textTransform: "none" as const,
  },
  caption: {
    fontSize: "0.75rem",
    fontWeight: 400,
    lineHeight: 1.33,
    letterSpacing: "0.4px",
  },
  overline: {
    fontSize: "0.75rem",
    fontWeight: 500,
    lineHeight: 1.33,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },
};

// Shape Tokens
const m3Shape = {
  borderRadius: 12,
  borderRadiusSmall: 8,
  borderRadiusMedium: 12,
  borderRadiusLarge: 16,
  borderRadiusExtraLarge: 28,
  borderRadiusFull: 9999,
};

// Theme configuration
const themeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: m3Colors.primary,
    secondary: m3Colors.secondary,
    error: m3Colors.error,
    success: m3Colors.success,
    warning: m3Colors.warning,
    info: m3Colors.info,
    background: m3Colors.background,
    text: {
      primary: m3Colors.onSurface,
      secondary: m3Colors.onSurfaceVariant,
      disabled: "rgba(255, 255, 255, 0.38)",
    },
    divider: m3Colors.outlineVariant,
    action: {
      active: m3Colors.onSurface,
      hover: "rgba(0, 200, 83, 0.08)",
      selected: "rgba(0, 200, 83, 0.16)",
      disabled: "rgba(255, 255, 255, 0.38)",
      disabledBackground: "rgba(255, 255, 255, 0.12)",
    },
  },
  typography: m3Typography,
  shape: {
    borderRadius: m3Shape.borderRadius,
  },
  spacing: 8,
  components: {
    // AppBar
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: "default",
      },
      styleOverrides: {
        root: {
          backgroundColor: m3Colors.background.paper,
          backgroundImage: "none",
        },
      },
    },
    // Button - Green primary buttons
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: "10px 24px",
          minHeight: 40,
          textTransform: "none",
          fontWeight: 500,
        },
        contained: {
          "&:hover": {
            boxShadow: "0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)",
          },
        },
        outlined: {
          borderColor: m3Colors.outline,
          "&:hover": {
            backgroundColor: "rgba(0, 200, 83, 0.08)",
            borderColor: m3Colors.primary.main,
          },
        },
        text: {
          "&:hover": {
            backgroundColor: "rgba(0, 200, 83, 0.08)",
          },
        },
      },
    },
    // IconButton
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: "50%",
          "&:hover": {
            backgroundColor: "rgba(0, 200, 83, 0.08)",
          },
        },
      },
    },
    // Card
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: m3Colors.surfaceContainerHigh,
          borderRadius: m3Shape.borderRadiusMedium,
          border: `1px solid ${m3Colors.outlineVariant}`,
        },
      },
    },
    // CardContent
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          "&:last-child": {
            paddingBottom: 16,
          },
        },
      },
    },
    // Chip - Green active state
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          height: 32,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: m3Colors.primary.main,
          color: m3Colors.primary.contrastText,
        },
        outlined: {
          borderColor: m3Colors.outline,
        },
        colorPrimary: {
          backgroundColor: m3Colors.primary.main,
          color: m3Colors.primary.contrastText,
        },
      },
    },
    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: m3Colors.surfaceContainerHigh,
          borderRadius: m3Shape.borderRadiusExtraLarge,
          backgroundImage: "none",
        },
      },
    },
    // DialogTitle
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          ...m3Typography.headlineSmall,
          padding: "24px 24px 16px",
        },
      },
    },
    // DialogContent
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "0 24px 24px",
        },
      },
    },
    // DialogActions
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: "16px 24px 24px",
          gap: 8,
        },
      },
    },
    // Tabs
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
        indicator: {
          height: 3,
          borderRadius: "3px 3px 0 0",
          backgroundColor: m3Colors.primary.main,
        },
      },
    },
    // Tab
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          minHeight: 48,
          padding: "12px 16px",
          "&.Mui-selected": {
            color: m3Colors.primary.main,
          },
        },
      },
    },
    // BottomNavigation
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: m3Colors.surfaceContainer,
          height: 80,
          borderTop: `1px solid ${m3Colors.outlineVariant}`,
        },
      },
    },
    // BottomNavigationAction
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 80,
          padding: "12px 12px 16px",
          gap: 4,
          color: m3Colors.onSurfaceVariant,
          "&.Mui-selected": {
            color: m3Colors.primary.main,
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.75rem",
              fontWeight: 500,
            },
          },
        },
        label: {
          fontSize: "0.75rem",
          fontWeight: 500,
          marginTop: 4,
        },
      },
    },
    // Switch - Green when on
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 52,
          height: 32,
          padding: 0,
        },
        switchBase: {
          padding: 4,
          "&.Mui-checked": {
            transform: "translateX(20px)",
            "& + .MuiSwitch-track": {
              backgroundColor: m3Colors.primary.main,
              opacity: 1,
            },
          },
        },
        thumb: {
          width: 24,
          height: 24,
          boxShadow: "0px 1px 3px 1px rgba(0, 0, 0, 0.15)",
        },
        track: {
          borderRadius: 16,
          backgroundColor: m3Colors.surfaceVariant,
          opacity: 1,
        },
      },
    },
    // List
    MuiList: {
      styleOverrides: {
        root: {
          padding: 0,
        },
      },
    },
    // ListItem
    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    // ListItemButton
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: m3Shape.borderRadiusSmall,
          "&:hover": {
            backgroundColor: "rgba(0, 200, 83, 0.08)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 200, 83, 0.16)",
          },
        },
      },
    },
    // Avatar
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: m3Colors.primary.main,
          color: m3Colors.primary.contrastText,
        },
      },
    },
    // Snackbar
    MuiSnackbar: {
      styleOverrides: {
        root: {
          bottom: 88,
        },
      },
    },
    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: m3Shape.borderRadiusMedium,
        },
        filledSuccess: {
          backgroundColor: m3Colors.success.main,
        },
        filledError: {
          backgroundColor: m3Colors.error.main,
        },
        filledWarning: {
          backgroundColor: m3Colors.warning.dark,
        },
        filledInfo: {
          backgroundColor: m3Colors.info.dark,
        },
      },
    },
    // TextField
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: m3Shape.borderRadiusSmall,
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: m3Colors.primary.main,
            },
          },
        },
      },
    },
    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0px 1px 3px 1px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)",
        },
        elevation2: {
          boxShadow: "0px 2px 6px 2px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.30)",
        },
        elevation3: {
          boxShadow: "0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px 0px rgba(0, 0, 0, 0.30)",
        },
      },
    },
    // Divider
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: m3Colors.outlineVariant,
        },
      },
    },
    // Checkbox
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: m3Colors.onSurfaceVariant,
          "&.Mui-checked": {
            color: m3Colors.primary.main,
          },
        },
      },
    },
    // CircularProgress
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: m3Colors.primary.main,
        },
      },
    },
    // LinearProgress
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: m3Colors.surfaceVariant,
        },
      },
    },
    // Skeleton
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: m3Colors.surfaceContainerHighest,
        },
      },
    },
    // ToggleButton
    MuiToggleButton: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: m3Colors.primary.main,
            color: m3Colors.primary.contrastText,
            "&:hover": {
              backgroundColor: m3Colors.primary.dark,
            },
          },
        },
      },
    },
  },
};

// Create and export the theme
const m3Theme = createTheme(themeOptions);

export { m3Theme, m3Colors, m3Typography, m3Shape };
export default m3Theme;
