export type Currency = 'PLN' | 'EUR' | 'USD' | 'NOK';

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'PLN', label: 'Złoty (PLN)' },
  { code: 'NOK', label: 'Korona norweska (NOK)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'USD', label: 'Dolar amerykański (USD)' },
];

const cache = new Map<string, Intl.NumberFormat>();

function fmt(currency: Currency, digits: number): Intl.NumberFormat {
  const key = `${currency}-${digits}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    });
    cache.set(key, f);
  }
  return f;
}

export function money(value: number, currency: Currency, digits = 0): string {
  return fmt(currency, digits).format(Number.isFinite(value) ? value : 0);
}

export function compactMoney(value: number, currency: Currency): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('pl-PL', { maximumFractionDigits: 1 })} mln`;
  if (abs >= 1_000) return `${Math.round(value / 1_000).toLocaleString('pl-PL')} tys.`;
  return money(value, currency);
}

export function currencySymbol(currency: Currency): string {
  return fmt(currency, 0).formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency;
}

export function percent(value: number, digits = 2): string {
  return `${value.toLocaleString('pl-PL', { maximumFractionDigits: digits })}%`;
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const dd = n % 100;
  if (d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14)) return few;
  return many;
}

/** 121 -> "10 lat 1 mies." */
export function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts: string[] = [];
  if (y > 0) parts.push(`${y} ${plural(y, 'rok', 'lata', 'lat')}`);
  if (m > 0 || y === 0) parts.push(`${m} mies.`);
  return parts.join(' ');
}

/** "2025-03" + 0 -> "mar 2025" */
export function monthLabel(startMonth: string, offset: number): string {
  const [ys, ms] = startMonth.split('-');
  const d = new Date(Number(ys), Number(ms) - 1 + offset, 1);
  if (Number.isNaN(d.getTime())) return `${offset + 1}`;
  return d.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
}

export function endDateLabel(startMonth: string, months: number): string {
  const [ys, ms] = startMonth.split('-');
  const d = new Date(Number(ys), Number(ms) - 1 + months - 1, 1);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}
