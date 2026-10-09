import AddIcon from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import MoreVert from '@mui/icons-material/MoreVert';
import TrendingDown from '@mui/icons-material/TrendingDown';
import { Alert, Box, Button, Card, CardContent, Chip, Divider, Fab, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { useState } from 'react';
import { ConfirmDialog, LoanDialog, PropertyDialog } from '../components/LoanDialogs';
import { PropertyIcon } from '../components/PropertyIcon';
import { duration, endDateLabel, money, percent, type Currency } from '../lib/format';
import { compare } from '../lib/loan';
import { PROPERTY_KINDS, type Action, type AppState, type Loan, type Property } from '../state/store';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  onOpenForecast: (loanId: string) => void;
}

function monthsElapsed(startMonth: string): number {
  const [y, m] = startMonth.split('-').map(Number);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m) + 1);
}

export function LoansView({ state, dispatch, onOpenForecast }: Props) {
  const [propertyDialog, setPropertyDialog] = useState<{ open: boolean; property: Property | null }>({ open: false, property: null });
  const [loanDialog, setLoanDialog] = useState<{ open: boolean; loan: Loan | null; property: Property | null }>({
    open: false,
    loan: null,
    property: null,
  });
  const [confirm, setConfirm] = useState<{ kind: 'property' | 'loan'; id: string; name: string } | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; property: Property } | null>(null);

  // Podsumowanie per waluta - kwot w różnych walutach nie sumujemy.
  const totals = new Map<Currency, { debt: number; monthly: number; interest: number }>();
  for (const loan of state.loans) {
    const c = compare(loan, loan.strategy, loan.overpayment);
    const elapsed = Math.min(monthsElapsed(loan.startMonth), c.plan.months);
    const balance = elapsed === 0 ? loan.amount : c.plan.rows[elapsed - 1].balance;
    const t = totals.get(loan.currency) ?? { debt: 0, monthly: 0, interest: 0 };
    t.debt += balance;
    t.monthly += c.plan.firstPayment + loan.overpayment;
    t.interest += c.plan.totalInterest;
    totals.set(loan.currency, t);
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Box>
        <Typography variant="overline" color="primary">
          Portfel
        </Typography>
        <Typography variant="h1" component="h1">
          Nieruchomości i kredyty
        </Typography>
      </Box>

      {state.isSample && (
        <Alert severity="info" variant="outlined">
          To przykładowe dane, żeby od razu było widać, jak działa kalkulator. Dodaj własną nieruchomość albo wyczyść przykłady w Ustawieniach.
        </Alert>
      )}

      {totals.size > 0 && (
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
          {[...totals.entries()].map(([cur, t]) => (
            <Box key={cur} sx={{ display: 'contents' }}>
              <Summary label={`Saldo zadłużenia dziś${totals.size > 1 ? ` (${cur})` : ''}`} value={money(t.debt, cur)} />
              <Summary label="Miesięcznie z nadpłatami" value={money(t.monthly, cur)} />
              <Summary label="Odsetki w całym okresie" value={money(t.interest, cur)} />
            </Box>
          ))}
        </Box>
      )}

      {state.properties.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h3" sx={{ mb: 1 }}>
              Nie masz jeszcze żadnej nieruchomości
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Dodaj mieszkanie, dom albo działkę i przypisz do niej kredyt, żeby policzyć raty i efekt nadpłat.
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPropertyDialog({ open: true, property: null })}>
              Dodaj nieruchomość
            </Button>
          </CardContent>
        </Card>
      )}

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
        {state.properties.map((p) => {
          const loans = state.loans.filter((l) => l.propertyId === p.id);
          const debt = loans.reduce((a, l) => a + l.amount, 0);
          const sameCurrency = loans.every((l) => l.currency === loans[0]?.currency);
          const ltv = p.value && loans.length && sameCurrency ? (debt / p.value) * 100 : null;
          return (
            <Card key={p.id}>
              <CardContent sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={(t) => ({
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      bgcolor: t.palette.m3.primaryContainer,
                      color: t.palette.m3.onPrimaryContainer,
                    })}
                  >
                    <PropertyIcon kind={p.kind} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h4" component="h2" sx={{ overflowWrap: 'anywhere' }}>
                      {p.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                      <Chip size="small" label={PROPERTY_KINDS.find((k) => k.value === p.kind)?.label} />
                      {p.value && <Chip size="small" variant="outlined" label={`Wartość ${money(p.value, loans[0]?.currency ?? state.settings.defaultCurrency)}`} />}
                      {ltv !== null && <Chip size="small" variant="outlined" label={`LTV ${percent(ltv, 0)}`} />}
                    </Box>
                  </Box>
                  <IconButton aria-label={`Opcje: ${p.name}`} onClick={(e) => setMenu({ anchor: e.currentTarget, property: p })}>
                    <MoreVert />
                  </IconButton>
                </Box>

                {loans.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Brak kredytu przypisanego do tej nieruchomości.
                  </Typography>
                )}

                {loans.map((l) => {
                  const c = compare(l, l.strategy, l.overpayment);
                  return (
                    <Box key={l.id} sx={(t) => ({ p: 2, borderRadius: '12px', bgcolor: t.palette.m3.surfaceContainer, display: 'grid', gap: 1.5 })}>
                      <Box>
                        <Typography variant="subtitle1">{l.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {money(l.amount, l.currency)} · {percent(l.annualRate)} · {duration(l.termMonths)} · {l.paymentType === 'equal' ? 'raty równe' : 'raty malejące'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1.5 }}>
                        <Mini label={l.paymentType === 'equal' ? 'Rata' : 'Pierwsza rata'} value={money(c.base.firstPayment, l.currency)} />
                        <Mini label="Odsetki bez nadpłat" value={money(c.base.totalInterest, l.currency)} />
                        {l.overpayment > 0 ? (
                          <Mini label={`Koniec z nadpłatą ${money(l.overpayment, l.currency)}/mc`} value={endDateLabel(l.startMonth, c.plan.months)} />
                        ) : (
                          <Mini label="Koniec spłaty" value={endDateLabel(l.startMonth, c.base.months)} />
                        )}
                      </Box>
                      <Divider />
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Button size="small" variant="contained" startIcon={<TrendingDown />} onClick={() => onOpenForecast(l.id)}>
                          Prognoza nadpłat
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <IconButton size="small" aria-label={`Edytuj ${l.name}`} onClick={() => setLoanDialog({ open: true, loan: l, property: p })}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label={`Usuń ${l.name}`} onClick={() => setConfirm({ kind: 'loan', id: l.id, name: l.name })}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}

                <Box>
                  <Button startIcon={<AddIcon />} onClick={() => setLoanDialog({ open: true, loan: null, property: p })}>
                    Dodaj kredyt
                  </Button>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {state.properties.length > 0 && (
        <Fab
          variant="extended"
          color="primary"
          onClick={() => setPropertyDialog({ open: true, property: null })}
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 32 },
            bottom: { xs: 'calc(88px + env(safe-area-inset-bottom, 0px))', md: 'calc(32px + env(safe-area-inset-bottom, 0px))' },
            gap: 1,
          }}
        >
          <AddIcon />
          Nieruchomość
        </Fab>
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setPropertyDialog({ open: true, property: menu!.property });
            setMenu(null);
          }}
        >
          Edytuj nieruchomość
        </MenuItem>
        <MenuItem
          onClick={() => {
            setConfirm({ kind: 'property', id: menu!.property.id, name: menu!.property.name });
            setMenu(null);
          }}
          sx={{ color: 'error.main' }}
        >
          Usuń razem z kredytami
        </MenuItem>
      </Menu>

      <PropertyDialog
        open={propertyDialog.open}
        property={propertyDialog.property}
        defaultCurrency={state.settings.defaultCurrency}
        onClose={() => setPropertyDialog({ open: false, property: null })}
        onSave={(p, loan) => {
          dispatch({ type: 'saveProperty', property: p });
          if (loan) dispatch({ type: 'saveLoan', loan });
          setPropertyDialog({ open: false, property: null });
        }}
      />
      <LoanDialog
        open={loanDialog.open}
        loan={loanDialog.loan}
        property={loanDialog.property}
        defaultCurrency={state.settings.defaultCurrency}
        onClose={() => setLoanDialog({ open: false, loan: null, property: null })}
        onSave={(loan) => {
          dispatch({ type: 'saveLoan', loan });
          setLoanDialog({ open: false, loan: null, property: null });
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'property' ? 'Usunąć nieruchomość?' : 'Usunąć kredyt?'}
        text={
          confirm?.kind === 'property'
            ? `„${confirm?.name}” zostanie usunięta razem z przypisanymi kredytami.`
            : `Kredyt „${confirm?.name}” i jego ustawienia nadpłat zostaną usunięte.`
        }
        confirmLabel="Usuń"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === 'property') dispatch({ type: 'deleteProperty', id: confirm.id });
          if (confirm?.kind === 'loan') dispatch({ type: 'deleteLoan', id: confirm.id });
          setConfirm(null);
        }}
      />
    </Box>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={(t) => ({ p: 2, borderRadius: '16px', bgcolor: t.palette.m3.surfaceContainer, minWidth: 0 })}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.5rem', fontWeight: 600, mt: 0.5 }}>{value}</Typography>
    </Box>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}
