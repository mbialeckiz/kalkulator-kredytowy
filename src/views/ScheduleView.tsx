import ContentCopy from '@mui/icons-material/ContentCopy';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import {
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { duration, money, monthLabel } from '../lib/format';
import { canDownload, copyText, downloadFile } from '../lib/exportFile';
import { compare, groupByYear } from '../lib/loan';
import type { Action, AppState, Loan } from '../state/store';
import { STRATEGIES } from './ForecastView';
import { EmptyLoans, LoanPicker } from './shared';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onGoToLoans: () => void;
}

export function ScheduleView({ state, dispatch, onGoToLoans }: Props) {
  const loan = state.loans.find((l) => l.id === state.activeLoanId) ?? state.loans[0];
  if (!loan) return <EmptyLoans title="Harmonogram" onGoToLoans={onGoToLoans} />;
  return <Schedule key={loan.id} loan={loan} state={state} dispatch={dispatch} />;
}

const csvNum = (v: number) => v.toFixed(2).replace('.', ',');

function Schedule({ loan, state, dispatch }: { loan: Loan; state: AppState; dispatch: React.Dispatch<Action> }) {
  const [view, setView] = useState<'month' | 'year'>('year');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [toast, setToast] = useState('');
  const cur = loan.currency;
  const c = useMemo(() => compare(loan, loan.strategy, loan.overpayment), [loan]);
  const years = useMemo(() => groupByYear(c.plan.rows), [c]);
  const strategy = STRATEGIES.find((s) => s.value === loan.strategy)!;

  const csv = useMemo(() => {
    const head = 'Miesiąc;Data;Rata;Kapitał;Odsetki;Nadpłata;Saldo';
    const lines = c.plan.rows.map((r) =>
      [r.month, monthLabel(loan.startMonth, r.month - 1), csvNum(r.payment), csvNum(r.principal), csvNum(r.interest), csvNum(r.overpayment), csvNum(r.balance)].join(';'),
    );
    return [head, ...lines].join('\n');
  }, [c, loan.startMonth]);

  const totals = c.plan.rows.reduce(
    (a, r) => ({ payment: a.payment + r.payment, principal: a.principal + r.principal, interest: a.interest + r.interest, overpayment: a.overpayment + r.overpayment }),
    { payment: 0, principal: 0, interest: 0, overpayment: 0 },
  );

  const monthRows = c.plan.rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary">
            Plan spłaty
          </Typography>
          <Typography variant="h1">Harmonogram</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {loan.name} · {strategy.label}
            {loan.overpayment > 0 ? ` · nadpłata ${money(loan.overpayment, cur)}/mc` : ' · bez nadpłat'} · {duration(c.plan.months)}
          </Typography>
        </Box>
        <LoanPicker state={state} dispatch={dispatch} />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)} aria-label="Widok harmonogramu">
          <ToggleButton value="year" sx={{ px: 2 }}>
            Rocznie
          </ToggleButton>
          <ToggleButton value="month" sx={{ px: 2 }}>
            Miesięcznie
          </ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={async () => setToast((await copyText(csv)) ? 'Skopiowano harmonogram (CSV). Wklej go do Excela lub Arkuszy Google.' : 'Przeglądarka zablokowała schowek.')}
        >
          Kopiuj CSV
        </Button>
        {canDownload && (
          <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => downloadFile(`harmonogram-${loan.name}.csv`, '﻿' + csv, 'text/csv;charset=utf-8')}>
            Pobierz CSV
          </Button>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table size="small" stickyHeader sx={{ minWidth: 640, '& td, & th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>{view === 'year' ? 'Rok' : 'Miesiąc'}</TableCell>
                  <TableCell align="right">Raty</TableCell>
                  <TableCell align="right">Kapitał</TableCell>
                  <TableCell align="right">Odsetki</TableCell>
                  <TableCell align="right">Nadpłata</TableCell>
                  <TableCell align="right">Saldo po</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {view === 'year'
                  ? years.map((y) => (
                      <TableRow key={y.year} hover>
                        <TableCell>
                          {y.year}. rok
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {monthLabel(loan.startMonth, (y.year - 1) * 12)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{money(y.payment, cur)}</TableCell>
                        <TableCell align="right">{money(y.principal, cur)}</TableCell>
                        <TableCell align="right">{money(y.interest, cur)}</TableCell>
                        <TableCell align="right">{y.overpayment > 0 ? money(y.overpayment, cur) : '-'}</TableCell>
                        <TableCell align="right">{money(y.balance, cur)}</TableCell>
                      </TableRow>
                    ))
                  : monthRows.map((r) => (
                      <TableRow key={r.month} hover>
                        <TableCell>
                          {r.month}
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {monthLabel(loan.startMonth, r.month - 1)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{money(r.payment, cur, 2)}</TableCell>
                        <TableCell align="right">{money(r.principal, cur, 2)}</TableCell>
                        <TableCell align="right">{money(r.interest, cur, 2)}</TableCell>
                        <TableCell align="right">{r.overpayment > 0 ? money(r.overpayment, cur, 2) : '-'}</TableCell>
                        <TableCell align="right">{money(r.balance, cur, 2)}</TableCell>
                      </TableRow>
                    ))}
                <TableRow sx={(t) => ({ '& td': { fontWeight: 600, bgcolor: t.palette.m3.surfaceContainer } })}>
                  <TableCell>Razem</TableCell>
                  <TableCell align="right">{money(totals.payment, cur)}</TableCell>
                  <TableCell align="right">{money(totals.principal, cur)}</TableCell>
                  <TableCell align="right">{money(totals.interest, cur)}</TableCell>
                  <TableCell align="right">{money(totals.overpayment, cur)}</TableCell>
                  <TableCell align="right">{money(0, cur)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {view === 'month' && (
            <TablePagination
              component="div"
              count={c.plan.rows.length}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[12, 24, 60, 120]}
              labelRowsPerPage="Wierszy:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} z ${count}`}
            />
          )}
        </CardContent>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
