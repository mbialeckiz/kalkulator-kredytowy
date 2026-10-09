import { useEffect, useReducer } from 'react';
import type { Currency } from '../lib/format';
import type { PaymentType, Strategy } from '../lib/loan';

export type PropertyKind = 'mieszkanie' | 'dom' | 'dzialka';

export const PROPERTY_KINDS: { value: PropertyKind; label: string }[] = [
  { value: 'mieszkanie', label: 'Mieszkanie' },
  { value: 'dom', label: 'Dom' },
  { value: 'dzialka', label: 'Działka' },
];

export interface Property {
  id: string;
  name: string;
  kind: PropertyKind;
  value?: number;
}

export interface Loan {
  id: string;
  propertyId: string;
  name: string;
  amount: number;
  currency: Currency;
  annualRate: number;
  termMonths: number;
  paymentType: PaymentType;
  /** Pierwsza rata, format RRRR-MM */
  startMonth: string;
  overpayment: number;
  strategy: Strategy;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  defaultCurrency: Currency;
}

export interface AppState {
  version: 1;
  properties: Property[];
  loans: Loan[];
  settings: Settings;
  /** Kredyt wybrany w Prognozie i Harmonogramie */
  activeLoanId: string | null;
  /** true dopóki użytkownik pracuje na danych przykładowych */
  isSample: boolean;
}

export type Action =
  | { type: 'saveProperty'; property: Property }
  | { type: 'deleteProperty'; id: string }
  | { type: 'saveLoan'; loan: Loan }
  | { type: 'deleteLoan'; id: string }
  | { type: 'updateLoan'; id: string; patch: Partial<Loan> }
  | { type: 'selectLoan'; id: string }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'replace'; state: AppState }
  | { type: 'clear' };

const STORAGE_KEY = 'kalkulator-kredytowy:v1';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function sampleState(): AppState {
  const flat: Property = { id: 'sample-flat', name: 'Mieszkanie na Mokotowie', kind: 'mieszkanie', value: 520_000 };
  const plot: Property = { id: 'sample-plot', name: 'Działka pod Krakowem', kind: 'dzialka', value: 140_000 };
  return {
    version: 1,
    properties: [flat, plot],
    loans: [
      {
        id: 'sample-loan-1',
        propertyId: flat.id,
        name: 'Kredyt hipoteczny',
        amount: 300_000,
        currency: 'PLN',
        annualRate: 6.7,
        termMonths: 360,
        paymentType: 'equal',
        startMonth: currentMonth(),
        overpayment: 1500,
        strategy: 'shorten',
      },
      {
        id: 'sample-loan-2',
        propertyId: plot.id,
        name: 'Kredyt na działkę',
        amount: 90_000,
        currency: 'PLN',
        annualRate: 7.4,
        termMonths: 180,
        paymentType: 'decreasing',
        startMonth: currentMonth(),
        overpayment: 300,
        strategy: 'reduce',
      },
    ],
    settings: { themeMode: 'system', defaultCurrency: 'PLN' },
    activeLoanId: 'sample-loan-1',
    isSample: true,
  };
}

function emptyState(settings: Settings): AppState {
  return { version: 1, properties: [], loans: [], settings, activeLoanId: null, isSample: false };
}

export function isAppState(x: unknown): x is AppState {
  const s = x as AppState;
  return !!s && s.version === 1 && Array.isArray(s.properties) && Array.isArray(s.loans) && !!s.settings;
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    }
  } catch {
    // brak dostępu do localStorage (tryb prywatny, podgląd) - działamy w pamięci
  }
  return sampleState();
}

function persist(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignorujemy - dane zostają w pamięci do końca sesji
  }
}

function reducer(state: AppState, action: Action): AppState {
  // Pierwsza zmiana danych kończy tryb przykładowy (ustawienia go nie kończą).
  const touched = { ...state, isSample: false };
  switch (action.type) {
    case 'saveProperty': {
      const exists = state.properties.some((p) => p.id === action.property.id);
      return {
        ...touched,
        properties: exists
          ? state.properties.map((p) => (p.id === action.property.id ? action.property : p))
          : [...state.properties, action.property],
      };
    }
    case 'deleteProperty': {
      const loans = state.loans.filter((l) => l.propertyId !== action.id);
      return {
        ...touched,
        properties: state.properties.filter((p) => p.id !== action.id),
        loans,
        activeLoanId: loans.some((l) => l.id === state.activeLoanId) ? state.activeLoanId : (loans[0]?.id ?? null),
      };
    }
    case 'saveLoan': {
      const exists = state.loans.some((l) => l.id === action.loan.id);
      return {
        ...touched,
        loans: exists ? state.loans.map((l) => (l.id === action.loan.id ? action.loan : l)) : [...state.loans, action.loan],
        activeLoanId: action.loan.id,
      };
    }
    case 'deleteLoan': {
      const loans = state.loans.filter((l) => l.id !== action.id);
      return {
        ...touched,
        loans,
        activeLoanId: state.activeLoanId === action.id ? (loans[0]?.id ?? null) : state.activeLoanId,
      };
    }
    case 'updateLoan':
      return { ...state, loans: state.loans.map((l) => (l.id === action.id ? { ...l, ...action.patch } : l)) };
    case 'selectLoan':
      return { ...state, activeLoanId: action.id };
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'replace':
      return { ...action.state, isSample: false };
    case 'clear':
      return emptyState(state.settings);
  }
}

export function useAppState() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => persist(state), [state]);
  return [state, dispatch] as const;
}
