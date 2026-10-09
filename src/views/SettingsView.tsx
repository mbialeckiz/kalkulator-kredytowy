import ContentCopy from '@mui/icons-material/ContentCopy';
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import { Box, Button, Card, CardContent, MenuItem, Snackbar, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { ConfirmDialog } from '../components/LoanDialogs';
import { CURRENCIES, type Currency } from '../lib/format';
import { canDownload, copyText, downloadFile } from '../lib/exportFile';
import { isAppState, sampleState, type Action, type AppState, type ThemeMode } from '../state/store';

interface Props {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export function SettingsView({ state, dispatch }: Props) {
  const [toast, setToast] = useState('');
  const [pasted, setPasted] = useState('');
  const [confirm, setConfirm] = useState<'clear' | 'sample' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const json = JSON.stringify(state, null, 2);

  function importText(text: string) {
    try {
      const parsed = JSON.parse(text);
      if (!isAppState(parsed)) throw new Error('format');
      dispatch({ type: 'replace', state: parsed });
      setPasted('');
      setToast(`Zaimportowano: ${parsed.properties.length} nieruchomości, ${parsed.loans.length} kredytów.`);
    } catch {
      setToast('To nie jest plik eksportu z kalkulatora. Sprawdź, czy wklejasz cały tekst JSON.');
    }
  }

  return (
    <Box sx={{ display: 'grid', gap: 3, maxWidth: 760 }}>
      <Box>
        <Typography variant="overline" color="primary">
          Konto
        </Typography>
        <Typography variant="h1">Ustawienia</Typography>
      </Box>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2.5 }}>
          <Typography variant="h4" component="h2">
            Wygląd i domyślne wartości
          </Typography>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Motyw
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={state.settings.themeMode}
              onChange={(_, v: ThemeMode | null) => v && dispatch({ type: 'settings', patch: { themeMode: v } })}
            >
              <ToggleButton value="system" sx={{ px: 2 }}>
                Systemowy
              </ToggleButton>
              <ToggleButton value="light" sx={{ px: 2 }}>
                Jasny
              </ToggleButton>
              <ToggleButton value="dark" sx={{ px: 2 }}>
                Ciemny
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <TextField
            id="default-currency"
            select
            label="Domyślna waluta nowych kredytów"
            value={state.settings.defaultCurrency}
            onChange={(e) => dispatch({ type: 'settings', patch: { defaultCurrency: e.target.value as Currency } })}
            sx={{ maxWidth: 360 }}
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h4" component="h2">
            Kopia danych
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dane zapisują się tylko w tej przeglądarce. Zrób kopię, żeby przenieść je na inne urządzenie albo do przyszłej aplikacji webowej.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<ContentCopy />}
              onClick={async () => setToast((await copyText(json)) ? 'Skopiowano dane (JSON) do schowka.' : 'Przeglądarka zablokowała schowek.')}
            >
              Kopiuj dane
            </Button>
            {canDownload && (
              <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={() => downloadFile('kalkulator-kredytowy.json', json, 'application/json')}>
                Pobierz plik
              </Button>
            )}
            <Button variant="outlined" startIcon={<FileUploadOutlined />} onClick={() => fileRef.current?.click()}>
              Wczytaj plik
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) importText(await f.text());
                e.target.value = '';
              }}
            />
          </Box>
          <TextField
            id="import-json"
            label="albo wklej skopiowane dane"
            multiline
            minRows={2}
            maxRows={6}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          {pasted.trim() && (
            <Box>
              <Button variant="contained" onClick={() => importText(pasted)}>
                Importuj wklejone dane
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h4" component="h2">
            Dane
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setConfirm('sample')}>
              Wczytaj przykładowe dane
            </Button>
            <Button variant="outlined" color="error" onClick={() => setConfirm('clear')}>
              Usuń wszystkie dane
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="h4" component="h2">
            Jak liczymy
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '68ch', lineHeight: 1.65 }}>
            Odsetki naliczamy co miesiąc od bieżącego salda (oprocentowanie roczne / 12). Nadpłata trafia w kapitał w tym samym miesiącu co rata.
            Przy skróceniu okresu rata zostaje bez zmian; przy zmniejszeniu raty i wariancie piramidalnym rata jest przeliczana na pozostały
            okres po każdej nadpłacie. Symulacja zakłada stałe oprocentowanie i nie uwzględnia prowizji, ubezpieczeń ani opłat za wcześniejszą
            spłatę, więc traktuj wyniki jako prognozę, a nie ofertę banku.
          </Typography>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirm === 'clear'}
        title="Usunąć wszystkie dane?"
        text="Nieruchomości i kredyty zostaną usunięte z tej przeglądarki. Ustawienia wyglądu zostaną."
        confirmLabel="Usuń dane"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: 'clear' });
          setConfirm(null);
          setToast('Usunięto dane.');
        }}
      />
      <ConfirmDialog
        open={confirm === 'sample'}
        title="Zastąpić dane przykładami?"
        text="Twoje obecne nieruchomości i kredyty zostaną zastąpione danymi przykładowymi."
        confirmLabel="Zastąp"
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          dispatch({ type: 'replace', state: { ...sampleState(), settings: state.settings } });
          setConfirm(null);
        }}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
