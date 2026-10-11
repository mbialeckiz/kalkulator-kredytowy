# Kalkulator kredytowy

Symulator kosztów kredytu i nadpłat: nieruchomości (mieszkanie, dom, działka) z przypisanymi kredytami
w PLN, NOK, EUR lub USD, prognoza nadpłat w trzech strategiach, harmonogram spłat i eksport danych.

Stack: Vite + React + TypeScript + MUI (Material Design 3). Dane zapisują się w `localStorage`.

## Strategie nadpłaty

| Strategia | Co się dzieje |
|---|---|
| Skrócenie okresu | rata bez zmian, nadpłata skraca okres |
| Zmniejszenie raty | okres bez zmian, rata przeliczana po każdej nadpłacie, nadpłata stała |
| Piramidalna | rata przeliczana jak wyżej, ale płacisz stałą kwotę (rata startowa + nadpłata), więc nadpłata rośnie |

Silnik obliczeń: `src/lib/loan.ts` (czyste funkcje). Testy:

- `src/lib/loan.test.ts` - scenariusze akceptacyjne (m.in. 300 000 zł / 6,7% / 30 lat / nadpłata 1500 zł),
- `src/lib/loan.verify.test.ts` - zgodność z zamkniętymi wzorami (PMT, saldo po k miesiącach, liczba rat
  przy skróceniu okresu, suma odsetek dla rat malejących) i właściwości sprawdzane na 2000 losowych kredytów.

Założenia modelu: odsetki miesięczne = saldo × oprocentowanie / 12, stałe oprocentowanie, bez prowizji,
ubezpieczeń i opłat. Banki liczące odsetki za faktyczną liczbę dni (rok 365) dają w testach do ok. 0,2% wyższe odsetki.

## Komendy

```bash
npm install
npm run dev        # serwer deweloperski
npm test           # testy silnika (vitest)
npm run build      # dist/index.html jako jeden plik + artifact/kalkulator-kredytowy.html do publikacji jako artefakt
npx vite build --mode webapp   # zwykły build aplikacji webowej (osobne pliki JS/CSS)
```

## Struktura

- `src/lib` - silnik kredytu, formatowanie kwot i dat, eksport plików
- `src/state/store.ts` - model danych (nieruchomości, kredyty, ustawienia) i zapis w przeglądarce
- `src/views` - ekrany: Kredyty, Prognoza, Harmonogram, Ustawienia
- `src/components` - karty statystyk, wykres struktury kosztu, wykres salda, dialogi
