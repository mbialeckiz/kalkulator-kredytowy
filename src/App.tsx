import AccountBalanceOutlined from '@mui/icons-material/AccountBalanceOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import TrendingDown from '@mui/icons-material/TrendingDown';
import { BottomNavigation, BottomNavigationAction, Box, ButtonBase, CssBaseline, Paper, Typography, useMediaQuery } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { useAppState } from './state/store';
import { buildTheme } from './theme';
import { ForecastView } from './views/ForecastView';
import { LoansView } from './views/LoansView';
import { ScheduleView } from './views/ScheduleView';
import { SettingsView } from './views/SettingsView';

type Tab = 'kredyty' | 'prognoza' | 'harmonogram' | 'ustawienia';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'kredyty', label: 'Kredyty', icon: <AccountBalanceOutlined /> },
  { value: 'prognoza', label: 'Prognoza', icon: <TrendingDown /> },
  { value: 'harmonogram', label: 'Harmonogram', icon: <TableRowsOutlined /> },
  { value: 'ustawienia', label: 'Ustawienia', icon: <SettingsOutlined /> },
];

function tabFromHash(): Tab {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.value === h)?.value ?? 'kredyty') as Tab;
}

/** Motyw: wybór z ustawień, a przy "Systemowy" - motyw okna Claude (data-theme) lub systemu. */
function useResolvedMode(setting: 'system' | 'light' | 'dark'): 'light' | 'dark' {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const [hostTheme, setHostTheme] = useState(() => document.documentElement.getAttribute('data-theme'));
  useEffect(() => {
    const mo = new MutationObserver(() => setHostTheme(document.documentElement.getAttribute('data-theme')));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  if (setting !== 'system') return setting;
  if (hostTheme === 'dark' || hostTheme === 'light') return hostTheme;
  return prefersDark ? 'dark' : 'light';
}

export default function App() {
  const [state, dispatch] = useAppState();
  const mode = useResolvedMode(state.settings.themeMode);
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const [tab, setTabState] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const onHash = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      history.replaceState(null, '', `#${t}`);
    } catch {
      // w niektórych ramkach history jest niedostępne
    }
    window.scrollTo({ top: 0 });
  };

  const openForecast = (loanId: string) => {
    dispatch({ type: 'selectLoan', id: loanId });
    setTab('prognoza');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100%' }}>
        {/* Szyna nawigacji (desktop) */}
        <Box
          component="nav"
          aria-label="Główna nawigacja"
          sx={(t) => ({
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1.5,
            width: 96,
            flex: '0 0 96px',
            position: 'sticky',
            top: 'env(safe-area-inset-top, 0px)',
            height: '100vh',
            pt: 3,
            bgcolor: t.palette.m3.surfaceContainer,
          })}
        >
          <Box
            sx={(t) => ({
              width: 48,
              height: 48,
              borderRadius: '12px',
              display: 'grid',
              placeItems: 'center',
              mb: 2,
              bgcolor: t.palette.primary.main,
              color: t.palette.primary.contrastText,
              fontWeight: 700,
              fontSize: 18,
            })}
            aria-hidden
          >
            %
          </Box>
          {TABS.map((t) => {
            const active = tab === t.value;
            return (
              <ButtonBase
                key={t.value}
                onClick={() => setTab(t.value)}
                aria-current={active ? 'page' : undefined}
                sx={{ display: 'grid', justifyItems: 'center', gap: 0.5, width: 80, py: 0.5, borderRadius: '12px' }}
              >
                <Box
                  sx={(th) => ({
                    width: 56,
                    height: 32,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: active ? th.palette.m3.secondaryContainer : 'transparent',
                    color: active ? th.palette.m3.onSecondaryContainer : th.palette.m3.onSurfaceVariant,
                    transition: 'background-color 150ms',
                  })}
                >
                  {t.icon}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: active ? 600 : 500, color: active ? 'text.primary' : 'text.secondary' }}>
                  {t.label}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, sm: 3, md: 5 },
            pt: { xs: 2.5, md: 4 },
            pb: { xs: 'calc(112px + env(safe-area-inset-bottom, 0px))', md: 6 },
          }}
        >
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {tab === 'kredyty' && <LoansView state={state} dispatch={dispatch} onOpenForecast={openForecast} />}
            {tab === 'prognoza' && <ForecastView state={state} dispatch={dispatch} onGoToLoans={() => setTab('kredyty')} />}
            {tab === 'harmonogram' && <ScheduleView state={state} dispatch={dispatch} onGoToLoans={() => setTab('kredyty')} />}
            {tab === 'ustawienia' && <SettingsView state={state} dispatch={dispatch} />}
          </Box>
        </Box>
      </Box>

      {/* Dolna nawigacja (telefon) */}
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          borderRadius: 0,
          pb: 'env(safe-area-inset-bottom, 0px)',
          bgcolor: (t) => t.palette.m3.surfaceContainer,
        }}
      >
        <BottomNavigation
          showLabels
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={(t) => ({
            py: 1,
            '& .MuiBottomNavigationAction-root': { minWidth: 0, px: 0.5, color: t.palette.m3.onSurfaceVariant },
            '& .MuiBottomNavigationAction-label': { fontSize: 12, mt: 0.5, '&.Mui-selected': { fontSize: 12, fontWeight: 600 } },
            '& .Mui-selected': { color: t.palette.m3.onSurface },
            '& .Mui-selected svg': { bgcolor: t.palette.m3.secondaryContainer, color: t.palette.m3.onSecondaryContainer },
            '& svg': { width: 56, height: 32, px: '16px', borderRadius: 999, boxSizing: 'border-box', transition: 'background-color 150ms' },
          })}
        >
          {TABS.map((t) => (
            <BottomNavigationAction key={t.value} value={t.value} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </ThemeProvider>
  );
}
