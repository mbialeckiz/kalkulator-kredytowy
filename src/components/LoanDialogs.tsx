import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { CURRENCIES, currencySymbol, money, type Currency } from '../lib/format';
import { annuityPayment, type PaymentType } from '../lib/loan';
import { PROPERTY_KINDS, uid, type Loan, type Property, type PropertyKind } from '../state/store';
import { PropertyIcon } from './PropertyIcon';

interface LoanDraft {
  name: string;
  amount: string;
  currency: Currency;
  annualRate: string;
  years: string;
  months: string;
  paymentType: PaymentType;
  startMonth: string;
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function draftFromLoan(loan: Loan | null, currency: Currency): LoanDraft {
  if (!loan)
    return { name: 'Kredyt hipoteczny', amount: '', currency, annualRate: '', years: '30', months: '0', paymentType: 'equal', startMonth: thisMonth() };
  return {
    name: loan.name,
    amount: String(loan.amount),
    currency: loan.currency,
    annualRate: String(loan.annualRate),
    years: String(Math.floor(loan.termMonths / 12)),
    months: String(loan.termMonths % 12),
    paymentType: loan.paymentType,
    startMonth: loan.startMonth,
  };
}

const num = (s: string) => Number(String(s).replace(/\s/g, '').replace(',', '.'));

function validate(d: LoanDraft) {
  const amount = num(d.amount);
  const rate = num(d.annualRate);
  const term = Math.round(num(d.years) * 12 + num(d.months || '0'));
  return {
    amount: !(amount > 0) ? 'Podaj kwotę większą od zera' : '',
    rate: !(rate >= 0 && rate <= 50) ? 'Podaj oprocentowanie od 0 do 50%' : '',
    term: !(term >= 1 && term <= 600) ? 'Okres od 1 miesiąca do 50 lat' : '',
    values: { amount, rate, term },
  };
}

function LoanFields({ draft, onChange, showErrors }: { draft: LoanDraft; onChange: (d: LoanDraft) => void; showErrors: boolean }) {
  const v = validate(draft);
  const set = (patch: Partial<LoanDraft>) => onChange({ ...draft, ...patch });
  const preview =
    !v.amount && !v.rate && !v.term
      ? draft.paymentType === 'equal'
        ? annuityPayment(v.values.amount, v.values.rate, v.values.term)
        : v.values.amount / v.values.term + (v.values.amount * v.values.rate) / 1200
      : null;
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      <TextField id="loan-name" label="Nazwa kredytu" value={draft.name} onChange={(e) => set({ name: e.target.value })} sx={{ gridColumn: '1 / -1' }} />
      <TextField
        id="loan-amount"
        label="Kwota kredytu"
        inputMode="decimal"
        value={draft.amount}
        onChange={(e) => set({ amount: e.target.value })}
        error={showErrors && !!v.amount}
        helperText={showErrors && v.amount}
        slotProps={{ input: { endAdornment: <InputAdornment position="end">{currencySymbol(draft.currency)}</InputAdornment> } }}
      />
      <TextField id="loan-currency" select label="Waluta" value={draft.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
        {CURRENCIES.map((c) => (
          <MenuItem key={c.code} value={c.code}>
            {c.label}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        id="loan-rate"
        label="Oprocentowanie roczne"
        inputMode="decimal"
        value={draft.annualRate}
        onChange={(e) => set({ annualRate: e.target.value })}
        error={showErrors && !!v.rate}
        helperText={(showErrors && v.rate) || 'Marża + stawka referencyjna (np. WIBOR, NIBOR)'}
        slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
      />
      <TextField
        id="loan-start"
        label="Pierwsza rata"
        type="month"
        value={draft.startMonth}
        onChange={(e) => set({ startMonth: e.target.value })}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        id="loan-years"
        label="Okres (lata)"
        inputMode="numeric"
        value={draft.years}
        onChange={(e) => set({ years: e.target.value })}
        error={showErrors && !!v.term}
        helperText={showErrors && v.term}
      />
      <TextField id="loan-months" select label="+ miesiące" value={draft.months} onChange={(e) => set({ months: e.target.value })}>
        {Array.from({ length: 12 }, (_, i) => (
          <MenuItem key={i} value={String(i)}>
            {i}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Rodzaj rat
        </Typography>
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={draft.paymentType}
          onChange={(_, val) => val && set({ paymentType: val })}
        >
          <ToggleButton value="equal">Równe</ToggleButton>
          <ToggleButton value="decreasing">Malejące</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {preview !== null && (
        <Box sx={(t) => ({ gridColumn: '1 / -1', p: 1.5, borderRadius: '8px', bgcolor: t.palette.m3.surfaceContainerHighest })}>
          <Typography variant="body2">
            {draft.paymentType === 'equal' ? 'Rata miesięczna: ' : 'Pierwsza rata: '}
            <strong>{money(preview, draft.currency)}</strong>
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function toLoan(d: LoanDraft, base: Partial<Loan> & { propertyId: string }): Loan {
  const v = validate(d).values;
  return {
    id: base.id ?? uid(),
    propertyId: base.propertyId,
    name: d.name.trim() || 'Kredyt',
    amount: v.amount,
    currency: d.currency,
    annualRate: v.rate,
    termMonths: v.term,
    paymentType: d.paymentType,
    startMonth: d.startMonth || thisMonth(),
    overpayment: base.overpayment ?? 0,
    strategy: base.strategy ?? 'shorten',
  };
}

const isValid = (d: LoanDraft) => {
  const v = validate(d);
  return !v.amount && !v.rate && !v.term;
};

/** Dodanie / edycja nieruchomości. Przy dodawaniu od razu można podpiąć kredyt. */
export function PropertyDialog(props: {
  open: boolean;
  property: Property | null;
  defaultCurrency: Currency;
  onClose: () => void;
  onSave: (p: Property, loan: Loan | null) => void;
}) {
  const { open, property, defaultCurrency, onClose, onSave } = props;
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PropertyKind>('mieszkanie');
  const [value, setValue] = useState('');
  const [withLoan, setWithLoan] = useState(true);
  const [draft, setDraft] = useState<LoanDraft>(() => draftFromLoan(null, defaultCurrency));
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(property?.name ?? '');
    setKind(property?.kind ?? 'mieszkanie');
    setValue(property?.value ? String(property.value) : '');
    setWithLoan(!property);
    setDraft(draftFromLoan(null, defaultCurrency));
    setShowErrors(false);
  }, [open, property, defaultCurrency]);

  const kindLabel = PROPERTY_KINDS.find((k) => k.value === kind)!.label;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (withLoan && !isValid(draft)) {
      setShowErrors(true);
      return;
    }
    const p: Property = {
      id: property?.id ?? uid(),
      name: name.trim() || kindLabel,
      kind,
      value: num(value) > 0 ? num(value) : undefined,
    };
    onSave(p, withLoan ? toLoan(draft, { propertyId: p.id }) : null);
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="body">
      <form onSubmit={submit} noValidate>
        <DialogTitle>{property ? 'Edytuj nieruchomość' : 'Nowa nieruchomość'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2.5 }}>
          <ToggleButtonGroup exclusive fullWidth value={kind} onChange={(_, val) => val && setKind(val)} aria-label="Rodzaj nieruchomości">
            {PROPERTY_KINDS.map((k) => (
              <ToggleButton key={k.value} value={k.value} sx={{ gap: 1, py: 1.25 }}>
                <PropertyIcon kind={k.value} fontSize="small" />
                {k.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField id="property-name" label="Nazwa" placeholder={`np. ${kindLabel} w Oslo`} value={name} onChange={(e) => setName(e.target.value)} />
            <TextField
              id="property-value"
              label="Wartość (opcjonalnie)"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              helperText="Do wyliczenia wskaźnika LTV"
            />
          </Box>
          {!property && (
            <>
              <FormControlLabel control={<Switch checked={withLoan} onChange={(e) => setWithLoan(e.target.checked)} />} label="Przypisz od razu kredyt" />
              {withLoan && <LoanFields draft={draft} onChange={setDraft} showErrors={showErrors} />}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="contained">
            Zapisz
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Dodanie / edycja kredytu przypisanego do nieruchomości. */
export function LoanDialog(props: {
  open: boolean;
  loan: Loan | null;
  property: Property | null;
  defaultCurrency: Currency;
  onClose: () => void;
  onSave: (loan: Loan) => void;
}) {
  const { open, loan, property, defaultCurrency, onClose, onSave } = props;
  const [draft, setDraft] = useState<LoanDraft>(() => draftFromLoan(loan, defaultCurrency));
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromLoan(loan, defaultCurrency));
    setShowErrors(false);
  }, [open, loan, defaultCurrency]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid(draft) || !property) {
      setShowErrors(true);
      return;
    }
    onSave(toLoan(draft, { ...(loan ?? {}), propertyId: property.id }));
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="body">
      <form onSubmit={submit} noValidate>
        <DialogTitle>
          {loan ? 'Edytuj kredyt' : 'Nowy kredyt'}
          {property && (
            <Typography variant="body2" color="text.secondary">
              {property.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <LoanFields draft={draft} onChange={setDraft} showErrors={showErrors} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Anuluj</Button>
          <Button type="submit" variant="contained">
            Zapisz
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

/** Potwierdzenie w samej stronie - w artefakcie window.confirm() nie działa. */
export function ConfirmDialog(props: { open: boolean; title: string; text: string; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{props.text}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={props.onClose}>Anuluj</Button>
        <Button color="error" variant="contained" onClick={props.onConfirm}>
          {props.confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
