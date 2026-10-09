import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import {
  Box,
  Card,
  CardContent,
  InputAdornment,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { BalanceChart } from '../components/BalanceChart';
import { CostDonut } from '../components/CostDonut';
import { StatCard } from '../components/StatCard';
import { currencySymbol, duration, endDateLabel, money, percent } from '../lib/format';
import { compare, type Strategy } from '../lib/loan';
import type { Action, AppState, Loan } from '../state/store';
import { EmptyLoans, LoanPicker } from './shared';

export const STRATEGIES: { value: Strategy; label: string; short: string; description: string }[] = [
  {
    value: 'shorten',
    label: 'Skrócenie okresu',
    short: 'Skrócenie',
    description: 'Rata zostaje bez zmian, a każda nadpłata skraca czas spłaty. Najwięcej oszczędzasz na odsetkach.',
  },
  {
    value: 'reduce',
    label: 'Zmniejszenie raty',
    short: 'Niższa rata',
    description: 'Okres zostaje bez zmian, a bank po każdej nadpłacie obniża ratę. Większa ulga w budżecie, mniejsza oszczędność.',
  },
  {
    value: 'pyramid',
    label: 'Piramidalna (rata maleje)',
    short: 'Piramidalna',
    description:
      'Bank obniża ratę jak przy zmniejszeniu raty, ale Ty płacisz co miesiąc tę samą kwotę. Różnica trafia do nadpłaty, więc nadpłata rośnie z każdym miesiącem.',
  },
];

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onGoToLoans: () => void;
}

export function ForecastView({ state, dispatch, onGoToLoans }: Props) {
  const loan = state.loans.find((l) => l.id === state.activeLoanId) ?? state.loans[0];
  if (!loan) return <EmptyLoans title="Prognoza" onGoToLoans={onGoToLoans} />;
  return <Forecast key={loan.id} loan={loan} state={state} dispatch={dispatch} />;
}

function sliderMax(loan: Loan, firstPayment: number) {
  const unit = loan.currency === 'NOK' ? 1000 : 500;
  return Math.max(unit * 6, Math.ceil((firstPayment * 3) / unit) * unit);
}

function Forecast({ loan, state, dispatch }: { loan: Loan; state: AppState; dispatch: React.Dispatch<Action> }) {
  const property = state.properties.find((p) => p.id === loan.propertyId);
  const cur = loan.currency;
  const c = useMemo(() => compare(loan, loan.strategy, loan.overpayment), [loan]);
  const all = useMemo(
    () => STRATEGIES.map((s) => ({ ...s, result: compare(loan, s.value, loan.overpayment) })),
    [loan],
  );
  const max = sliderMax(loan, c.base.firstPayment);
  const step = loan.currency === 'NOK' ? 100 : 50;
  const update = (patch: Partial<Loan>) => dispatch({ type: 'updateLoan', id: loan.id, patch });
  const strategy = STRATEGIES.find((s) => s.value === loan.strategy)!;
  const hasOverpay = loan.overpayment > 0;
  const fixedTotal = c.plan.firstPayment + loan.overpayment;

  let tip: React.ReactNode;
  if (!hasOverpay) {
    tip = <>Przesuń suwak nadpłaty, żeby zobaczyć, ile zaoszczędzisz na odsetkach i o ile szybciej spłacisz kredyt.</>;
  } else if (loan.strategy === 'shorten') {
    tip = (
      <>
        Płacisz {loan.paymentType === 'equal' ? 'stałe' : 'na start'} <strong>{money(fixedTotal, cur)}/mc</strong> (rata {money(c.plan.firstPayment, cur)} + nadpłata{' '}
        {money(loan.overpayment, cur)}). Ostatnia rata: <strong>{endDateLabel(loan.startMonth, c.plan.months)}</strong> zamiast{' '}
        {endDateLabel(loan.startMonth, c.base.months)}.
      </>
    );
  } else if (loan.strategy === 'reduce') {
    tip = (
      <>
        Rata spada z {money(c.plan.firstPayment, cur)} do ok. <strong>{money(c.plan.lastPayment, cur)}</strong>. Z nadpłatą płacisz na początku{' '}
        {money(fixedTotal, cur)}/mc, a pod koniec ok. {money(c.plan.lastPayment + loan.overpayment, cur)}/mc.
      </>
    );
  } else {
    tip = (
      <>
        Płacisz stałe <strong>{money(fixedTotal, cur)}/mc</strong>. Twoja <strong>obowiązkowa</strong> rata spada aż do ok. {money(c.plan.lastPayment, cur)}, więc
        w gorszym miesiącu możesz zapłacić tylko tyle i nie stracisz tempa spłaty.
      </>
    );
  }

  const fourth =
    loan.strategy === 'reduce' ? (
      <StatCard label="Rata końcowa" value={money(c.plan.lastPayment, cur)} hint="obowiązkowa" />
    ) : (
      <StatCard
        label="Czas spłaty"
        value={duration(c.plan.months)}
        hint={loan.strategy === 'pyramid' && hasOverpay ? `rata obowiązkowa do ${money(c.plan.lastPayment, cur)}` : `ostatnia rata: ${endDateLabel(loan.startMonth, c.plan.months)}`}
      />
    );

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary">
            Symulacja nadpłat
          </Typography>
          <Typography variant="h1">Prognoza</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {property?.name} · <strong>{money(loan.amount, cur)}</strong> · {percent(loan.annualRate)} · {duration(loan.termMonths)}
          </Typography>
        </Box>
        <LoanPicker state={state} dispatch={dispatch} />
      </Box>

      <Box>
        <ToggleButtonGroup
          exclusive
          fullWidth
          value={loan.strategy}
          onChange={(_, v) => v && update({ strategy: v })}
          aria-label="Strategia nadpłaty"
          sx={{ '& .MuiToggleButton-root': { py: 1.25, lineHeight: 1.25 } }}
        >
          {STRATEGIES.map((s) => (
            <ToggleButton key={s.value} value={s.value}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {s.label}
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                {s.short}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25, maxWidth: '68ch' }}>
          {strategy.description}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" component="label" htmlFor="overpayment-input">
              Nadpłata miesięczna
            </Typography>
            <TextField
              id="overpayment-input"
              size="small"
              inputMode="numeric"
              value={loan.overpayment}
              onChange={(e) => {
                const v = Number(e.target.value.replace(/\s/g, '').replace(',', '.'));
                if (Number.isFinite(v) && v >= 0) update({ overpayment: Math.round(v) });
              }}
              sx={{ width: 160 }}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">{currencySymbol(cur)}</InputAdornment> }, htmlInput: { style: { textAlign: 'right', fontWeight: 600 } } }}
            />
          </Box>
          <Slider
            value={Math.min(loan.overpayment, max)}
            min={0}
            max={max}
            step={step}
            onChange={(_, v) => update({ overpayment: v as number })}
            aria-label="Nadpłata miesięczna"
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => money(v, cur)}
            marks={[
              { value: 0, label: '0' },
              { value: max, label: money(max, cur) },
            ]}
            sx={{ mx: 1, width: 'auto' }}
          />
        </CardContent>
      </Card>

      <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
        <StatCard label="Zaoszczędzone odsetki" value={money(c.savedInterest, cur)} tone="positive" />
        <StatCard label="Kredyt krótszy o" value={c.monthsShorter > 0 ? duration(c.monthsShorter) : '0 mies.'} tone="primary" />
        <StatCard label={loan.paymentType === 'equal' ? 'Rata startowa' : 'Pierwsza rata'} value={money(c.plan.firstPayment, cur)} hint={hasOverpay ? `+ ${money(loan.overpayment, cur)} nadpłaty` : undefined} />
        {fourth}
      </Box>

      <Box
        sx={(t) => ({
          display: 'flex',
          gap: 1.5,
          p: 2,
          borderRadius: '12px',
          bgcolor: t.palette.m3.secondaryContainer,
          color: t.palette.m3.onSecondaryContainer,
        })}
      >
        <LightbulbOutlined fontSize="small" sx={{ mt: '2px' }} />
        <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
          {tip}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' }, alignItems: 'start' }}>
        <Card>
          <CardContent>
            <Typography variant="h4" component="h2" sx={{ mb: 2 }}>
              Analiza kosztu kredytu
            </Typography>
            <CostDonut capital={loan.amount} interest={c.plan.totalInterest} saved={c.savedInterest} currency={cur} />
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 0 }}>
          <CardContent>
            <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
              Saldo zadłużenia
            </Typography>
            <BalanceChart base={c.base.rows} plan={c.plan.rows} amount={loan.amount} currency={cur} startMonth={loan.startMonth} />
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h4" component="h2">
            Porównanie strategii
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ta sama nadpłata {money(loan.overpayment, cur)}/mc w każdym wariancie. Kliknij wiersz, żeby go wybrać.
          </Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 560, '& td, & th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell>Strategia</TableCell>
                  <TableCell align="right">Czas spłaty</TableCell>
                  <TableCell align="right">Odsetki</TableCell>
                  <TableCell align="right">Oszczędność</TableCell>
                  <TableCell align="right">Rata końcowa</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary' }}>Bez nadpłat</TableCell>
                  <TableCell align="right">{duration(c.base.months)}</TableCell>
                  <TableCell align="right">{money(c.base.totalInterest, cur)}</TableCell>
                  <TableCell align="right">-</TableCell>
                  <TableCell align="right">{money(c.base.lastPayment, cur)}</TableCell>
                </TableRow>
                {all.map((s) => {
                  const selected = s.value === loan.strategy;
                  return (
                    <TableRow
                      key={s.value}
                      hover
                      selected={selected}
                      onClick={() => update({ strategy: s.value })}
                      sx={{ cursor: 'pointer', '& td': { fontWeight: selected ? 600 : 400 } }}
                    >
                      <TableCell>{s.label}</TableCell>
                      <TableCell align="right">{duration(s.result.plan.months)}</TableCell>
                      <TableCell align="right">{money(s.result.plan.totalInterest, cur)}</TableCell>
                      <TableCell align="right">{money(s.result.savedInterest, cur)}</TableCell>
                      <TableCell align="right">{money(s.result.plan.lastPayment, cur)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
