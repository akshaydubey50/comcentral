'use client';

import { useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0b625e', dark: '#064844', light: '#d8ebe8', contrastText: '#ffffff' },
    secondary: { main: '#b7683c' },
    background: { default: '#f5f3ee', paper: '#fffdf9' },
    text: { primary: '#172322', secondary: '#596664' },
    divider: '#dce2df',
    success: { main: '#3b7d5b' },
    warning: { main: '#a66321' },
    error: { main: '#b4443f' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontSize: 'clamp(1.75rem, 3vw, 2.35rem)', lineHeight: 1.12, fontWeight: 720, letterSpacing: '-0.035em' },
    h2: { fontSize: '1.25rem', lineHeight: 1.3, fontWeight: 700, letterSpacing: '-0.015em' },
    h3: { fontSize: '1rem', lineHeight: 1.4, fontWeight: 700 },
    button: { fontWeight: 650, textTransform: 'none' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44, borderRadius: 8 } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #dce2df' } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, color: '#445250', background: '#f7f8f5' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
