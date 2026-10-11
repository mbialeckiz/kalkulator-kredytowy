/**
 * Silnik obliczeń kredytu: harmonogram miesiąc po miesiącu z nadpłatami.
 * Czyste funkcje bez zależności od UI - do użycia w artefakcie, aplikacji webowej i testach.
 */

export type PaymentType = 'equal' | 'decreasing';

/**
 * Strategia nadpłaty:
 * - shorten: rata bez zmian, nadpłata skraca okres kredytu,
 * - reduce: okres bez zmian, po każdej nadpłacie bank przelicza (obniża) ratę; nadpłata stała,
 * - pyramid: rata przeliczana jak w `reduce`, ale płacisz stałą kwotę (rata startowa + nadpłata),
 *   więc nadpłata rośnie w miarę jak rata obowiązkowa spada.
 */
export type Strategy = 'shorten' | 'reduce' | 'pyramid';

export interface LoanParams {
  amount: number;
  /** Oprocentowanie roczne w procentach, np. 6.7 */
  annualRate: number;
  termMonths: number;
  paymentType: PaymentType;
}

export interface ScheduleRow {
  month: number;
  /** Rata obowiązkowa (kapitał + odsetki) wynikająca z umowy w danym miesiącu */
  payment: number;
  principal: number;
  interest: number;
  overpayment: number;
  balance: number;
}

export interface SimulationResult {
  rows: ScheduleRow[];
  months: number;
  totalInterest: number;
  totalPaid: number;
  totalOverpaid: number;
  firstPayment: number;
  lastPayment: number;
}

const EPS = 0.005;
const MAX_MONTHS = 1200;

export function monthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

/** Rata annuitetowa (równa) dla salda `balance` spłacanego przez `months` miesięcy. */
export function annuityPayment(balance: number, annualRate: number, months: number): number {
  if (months <= 0) return balance;
  const r = monthlyRate(annualRate);
  if (r === 0) return balance / months;
  return (balance * r) / (1 - Math.pow(1 + r, -months));
}

export function simulate(
  loan: LoanParams,
  strategy: Strategy = 'shorten',
  monthlyOverpayment = 0,
): SimulationResult {
  const r = monthlyRate(loan.annualRate);
  const N = Math.max(1, Math.round(loan.termMonths));
  const overpay = Math.max(0, monthlyOverpayment);
  const rows: ScheduleRow[] = [];

  let balance = Math.max(0, loan.amount);
  // Dla rat równych: aktualna rata; dla malejących: aktualna część kapitałowa.
  let installment = annuityPayment(balance, loan.annualRate, N);
  let capitalPart = balance / N;
  const firstPayment = loan.paymentType === 'equal' ? installment : capitalPart + balance * r;
  // Stała kwota miesięczna w strategii piramidalnej.
  const fixedTotal = firstPayment + overpay;

  let totalInterest = 0;
  let totalOverpaid = 0;
  let month = 0;
  let lastScheduled = 0;

  while (balance > 0 && month < MAX_MONTHS) {
    const remaining = Math.max(1, N - month);
    const recalc = strategy !== 'shorten' && month > 0 && overpay > 0;
    if (recalc) {
      if (loan.paymentType === 'equal') installment = annuityPayment(balance, loan.annualRate, remaining);
      else capitalPart = balance / remaining;
    }

    const interest = balance * r;
    const payment = loan.paymentType === 'equal' ? installment : capitalPart + interest;
    lastScheduled = payment;
    let principal = Math.min(Math.max(payment - interest, 0), balance);
    // Końcówka poniżej pół grosza trafia do ostatniej raty, żeby kapitał sumował się dokładnie.
    if (balance - principal < EPS) principal = balance;
    balance -= principal;

    let extra = 0;
    if (overpay > 0 && balance > 0) {
      extra = strategy === 'pyramid' ? Math.max(0, fixedTotal - payment) : overpay;
      if (extra >= balance - EPS) extra = balance;
      balance -= extra;
    }

    month++;
    totalInterest += interest;
    totalOverpaid += extra;
    rows.push({ month, payment: principal + interest, principal, interest, overpayment: extra, balance });

    // Po upływie umownego okresu bez nadpłat nie powinno nic zostać - zabezpieczenie przed pętlą.
    if (month >= N && strategy !== 'shorten' && overpay === 0) break;
  }

  return {
    rows,
    months: rows.length,
    totalInterest,
    totalPaid: loan.amount + totalInterest,
    totalOverpaid,
    firstPayment,
    // Rata wyznaczona przez bank w ostatnim miesiącu (przed ucięciem do salda) - w trybie
    // "zmniejszenie raty" spada niemal do zera, przy skróceniu okresu zostaje bez zmian.
    lastPayment: lastScheduled,
  };
}

export interface Comparison {
  base: SimulationResult;
  plan: SimulationResult;
  savedInterest: number;
  monthsShorter: number;
}

export function compare(loan: LoanParams, strategy: Strategy, monthlyOverpayment: number): Comparison {
  const base = simulate(loan, 'shorten', 0);
  const plan = simulate(loan, strategy, monthlyOverpayment);
  return {
    base,
    plan,
    savedInterest: Math.max(0, base.totalInterest - plan.totalInterest),
    monthsShorter: Math.max(0, base.months - plan.months),
  };
}

export interface YearRow {
  year: number;
  payment: number;
  principal: number;
  interest: number;
  overpayment: number;
  balance: number;
}

export function groupByYear(rows: ScheduleRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const row of rows) {
    const year = Math.ceil(row.month / 12);
    let y = years[year - 1];
    if (!y) {
      y = { year, payment: 0, principal: 0, interest: 0, overpayment: 0, balance: 0 };
      years.push(y);
    }
    y.payment += row.payment;
    y.principal += row.principal;
    y.interest += row.interest;
    y.overpayment += row.overpayment;
    y.balance = row.balance;
  }
  return years;
}
