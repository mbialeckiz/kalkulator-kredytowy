import { createTheme, type Theme } from '@mui/material/styles';

/**
 * Tokeny Material Design 3 (schemat tonalny wygenerowany z koloru bazowego #2F5F8F - "granat bankowy").
 * Kolory wykresów pochodzą z walidowanej palety kategorycznej (sloty 1-3: niebieski, pomarańczowy, morski).
 */
export interface M3Tokens {
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  chartCapital: string;
  chartInterest: string;
  chartSaved: string;
  chartBaseline: string;
  chartGrid: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    m3: M3Tokens;
  }
  interface PaletteOptions {
    m3?: M3Tokens;
  }
}

const light: M3Tokens = {
  surface: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3fa',
  surfaceContainer: '#eceef4',
  surfaceContainerHigh: '#e6e8ee',
  surfaceContainerHighest: '#e1e2e8',
  onSurface: '#191c20',
  onSurfaceVariant: '#43474e',
  outline: '#73777f',
  outlineVariant: '#c3c6cf',
  primaryContainer: '#d2e4ff',
  onPrimaryContainer: '#001c37',
  secondaryContainer: '#d7e3f7',
  onSecondaryContainer: '#101c2b',
  tertiaryContainer: '#c5ecd9',
  onTertiaryContainer: '#002115',
  chartCapital: '#2a78d6',
  chartInterest: '#eb6834',
  chartSaved: '#1baf7a',
  chartBaseline: '#8d9199',
  chartGrid: '#e1e2e8',
};

const dark: M3Tokens = {
  surface: '#111418',
  surfaceContainerLowest: '#0c0e13',
  surfaceContainerLow: '#191c20',
  surfaceContainer: '#1d2024',
  surfaceContainerHigh: '#272a2f',
  surfaceContainerHighest: '#32353a',
  onSurface: '#e1e2e8',
  onSurfaceVariant: '#c3c6cf',
  outline: '#8d9199',
  outlineVariant: '#43474e',
  primaryContainer: '#16476f',
  onPrimaryContainer: '#d2e4ff',
  secondaryContainer: '#3b4858',
  onSecondaryContainer: '#d7e3f7',
  tertiaryContainer: '#0f5039',
  onTertiaryContainer: '#c5ecd9',
  chartCapital: '#3987e5',
  chartInterest: '#d95926',
  chartSaved: '#199e70',
  chartBaseline: '#73777f',
  chartGrid: '#32353a',
};

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const t = mode === 'light' ? light : dark;
  return createTheme({
    palette: {
      mode,
      primary: mode === 'light' ? { main: '#2f5f8f', contrastText: '#ffffff' } : { main: '#a0cafd', contrastText: '#003258' },
      secondary: mode === 'light' ? { main: '#535f70', contrastText: '#ffffff' } : { main: '#bbc7db', contrastText: '#253140' },
      success: mode === 'light' ? { main: '#1f6b4f' } : { main: '#8fd5b4' },
      error: mode === 'light' ? { main: '#ba1a1a' } : { main: '#ffb4ab' },
      background: { default: t.surface, paper: t.surfaceContainerLow },
      text: { primary: t.onSurface, secondary: t.onSurfaceVariant },
      divider: t.outlineVariant,
      m3: t,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Roboto Flex", Roboto, "Segoe UI", system-ui, -apple-system, sans-serif',
      h1: { fontSize: '2rem', fontWeight: 500, letterSpacing: 0, lineHeight: 1.25 },
      h2: { fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.3 },
      h3: { fontSize: '1.375rem', fontWeight: 500, lineHeight: 1.3 },
      h4: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.4 },
      subtitle1: { fontSize: '1rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.01em' },
      body1: { fontSize: '1rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.45 },
      overline: { fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.08em', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.01em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontVariantNumeric: 'tabular-nums' },
          '@media (prefers-reduced-motion: reduce)': {
            '*': { transitionDuration: '0.01ms !important', animationDuration: '0.01ms !important' },
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 999, paddingInline: 20, minHeight: 40 } },
      },
      MuiFab: { styleOverrides: { root: { borderRadius: 16, textTransform: 'none' } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { borderRadius: 16, backgroundColor: t.surfaceContainerLow } },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 28, backgroundColor: t.surfaceContainerHigh } },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderColor: t.outline,
            color: t.onSurface,
            '&.Mui-selected': {
              backgroundColor: t.secondaryContainer,
              color: t.onSecondaryContainer,
              '&:hover': { backgroundColor: t.secondaryContainer },
            },
          },
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiBottomNavigation: {
        styleOverrides: { root: { backgroundColor: t.surfaceContainer, height: 'auto' } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.outlineVariant, fontVariantNumeric: 'tabular-nums' },
          head: { color: t.onSurfaceVariant, fontWeight: 500, backgroundColor: t.surfaceContainer },
        },
      },
    },
  });
}
