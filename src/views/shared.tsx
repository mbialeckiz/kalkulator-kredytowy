import { Box, Button, Card, CardContent, MenuItem, TextField, Typography } from '@mui/material';
import type { Action, AppState } from '../state/store';

export function LoanPicker({ state, dispatch }: { state: AppState; dispatch: React.Dispatch<Action> }) {
  const active = state.loans.find((l) => l.id === state.activeLoanId) ?? state.loans[0];
  if (state.loans.length < 2 || !active) return null;
  return (
    <TextField
      id="loan-picker"
      select
      size="small"
      label="Kredyt"
      value={active.id}
      onChange={(e) => dispatch({ type: 'selectLoan', id: e.target.value })}
      sx={{ minWidth: 240, maxWidth: '100%' }}
    >
      {state.loans.map((l) => {
        const p = state.properties.find((x) => x.id === l.propertyId);
        return (
          <MenuItem key={l.id} value={l.id}>
            {p ? `${p.name} · ${l.name}` : l.name}
          </MenuItem>
        );
      })}
    </TextField>
  );
}

export function EmptyLoans({ title, onGoToLoans }: { title: string; onGoToLoans: () => void }) {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Typography variant="h1">{title}</Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            Najpierw dodaj kredyt
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Symulacja nadpłat i harmonogram pojawią się, gdy przypiszesz kredyt do nieruchomości.
          </Typography>
          <Button variant="contained" onClick={onGoToLoans}>
            Przejdź do kredytów
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
