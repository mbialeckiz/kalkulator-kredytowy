/**
 * Weryfikacja silnika niezależnymi wzorami (zamknięte formuły matematyki finansowej)
 * oraz testami właściwości na losowych kredytach.
 */
import { describe, expect, it } from 'vitest';
import { annuityPayment, compare, simulate, type LoanParams, type PaymentType, type Strategy } from './loan';

/** Prosty, deterministyczny generator liczb losowych - powtarzalne wyniki testów. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('zamknięte wzory', () => {
  it('rata annuitetowa = wzór PMT z Excela', () => {
    // PMT(6,7%/12; 360; -300000) = 1935,83 (wartość referencyjna z arkusza)
    expect(annuityPayment(300_000, 6.7, 360)).toBeCloseTo(1935.83, 2);
    // PMT(5%/12; 300; -4 000 000) = 23 383,60
    expect(annuityPayment(4_000_000, 5, 300)).toBeCloseTo(23383.6, 2);
    // PMT(3%/12; 120; -100000) = 965,61
    expect(annuityPayment(100_000, 3, 120)).toBeCloseTo(965.61, 2);
  });

  it('saldo po k miesiącach = P(1+r)^k - T((1+r)^k - 1)/r', () => {
    const loan: LoanParams = { amount: 300_000, annualRate: 6.7, termMonths: 360, paymentType: 'equal' };
    const r = 0.067 / 12;
    const T = annuityPayment(300_000, 6.7, 360) + 1500;
    const s = simulate(loan, 'shorten', 1500);
    for (const k of [1, 12, 60, 100, 120]) {
      const g = Math.pow(1 + r, k);
      expect(s.rows[k - 1].balance).toBeCloseTo(300_000 * g - (T * (g - 1)) / r, 4);
    }
  });

  it('liczba miesięcy przy skróceniu okresu = ceil(-ln(1 - rP/T) / ln(1+r))', () => {
    const r0 = rng(7);
    for (let i = 0; i < 300; i++) {
      const amount = 50_000 + r0() * 3_000_000;
      const annualRate = 0.5 + r0() * 12;
      const termMonths = 60 + Math.floor(r0() * 360);
      const ov = Math.round(r0() * 8000);
      const r = annualRate / 1200;
      const T = annuityPayment(amount, annualRate, termMonths) + ov;
      const exact = -Math.log(1 - (r * amount) / T) / Math.log(1 + r);
      const s = simulate({ amount, annualRate, termMonths, paymentType: 'equal' }, 'shorten', ov);
      // tolerancja na przypadek, gdy wynik wypada prawie dokładnie na pełnym miesiącu
      expect(Math.abs(s.months - Math.ceil(exact - 1e-6))).toBeLessThanOrEqual(1);
    }
  });

  it('raty malejące: suma odsetek = rP(N+1)/2', () => {
    const s = simulate({ amount: 300_000, annualRate: 6.7, termMonths: 360, paymentType: 'decreasing' });
    expect(s.totalInterest).toBeCloseTo((0.067 / 12) * 300_000 * 361 / 2, 4);
  });

  it('raty równe bez nadpłat: suma odsetek = N*A - P', () => {
    const A = annuityPayment(300_000, 6.7, 360);
    const s = simulate({ amount: 300_000, annualRate: 6.7, termMonths: 360, paymentType: 'equal' });
    expect(s.totalInterest).toBeCloseTo(360 * A - 300_000, 4);
  });
});

describe('właściwości na 2000 losowych kredytów', { timeout: 120_000 }, () => {
  const r0 = rng(42);
  const cases: { loan: LoanParams; ov: number }[] = [];
  for (let i = 0; i < 2000; i++) {
    const paymentType: PaymentType = r0() < 0.5 ? 'equal' : 'decreasing';
    cases.push({
      loan: {
        amount: Math.round(10_000 + r0() * 5_000_000),
        annualRate: Math.round(r0() * 1500) / 100, // 0 - 15%
        termMonths: 12 + Math.floor(r0() * 469), // 1 - 40 lat
        paymentType,
      },
      ov: r0() < 0.15 ? 0 : Math.round(r0() * 20_000),
    });
  }
  const strategies: Strategy[] = ['shorten', 'reduce', 'pyramid'];

  it('każdy harmonogram jest wewnętrznie spójny', () => {
    for (const { loan, ov } of cases) {
      const r = loan.annualRate / 1200;
      for (const st of strategies) {
        const s = simulate(loan, st, ov);
        let prev = loan.amount;
        let capital = 0;
        let interest = 0;
        for (const row of s.rows) {
          expect(row.interest).toBeCloseTo(prev * r, 6); // odsetki od salda z poprzedniego miesiąca
          expect(row.principal).toBeGreaterThanOrEqual(0);
          expect(row.overpayment).toBeGreaterThanOrEqual(0);
          expect(row.balance).toBeGreaterThanOrEqual(0);
          expect(row.balance).toBeCloseTo(prev - row.principal - row.overpayment, 6);
          prev = row.balance;
          capital += row.principal + row.overpayment;
          interest += row.interest;
        }
        expect(s.rows.at(-1)!.balance).toBe(0); // kredyt zawsze spłacony do zera
        expect(capital / loan.amount).toBeCloseTo(1, 8); // spłacony cały kapitał, ani grosza więcej
        expect(interest).toBeCloseTo(s.totalInterest, 6);
        expect(s.months).toBeLessThanOrEqual(loan.termMonths); // nadpłata nigdy nie wydłuża kredytu
      }
    }
  });

  it('kolejność opłacalności strategii jest zgodna z teorią', () => {
    for (const { loan, ov } of cases) {
      const base = simulate(loan, 'shorten', 0).totalInterest;
      const sh = simulate(loan, 'shorten', ov);
      const re = simulate(loan, 'reduce', ov);
      const py = simulate(loan, 'pyramid', ov);
      const tol = 1e-6 * loan.amount;
      expect(sh.totalInterest).toBeLessThanOrEqual(base + tol);
      expect(re.totalInterest).toBeLessThanOrEqual(base + tol);
      expect(sh.totalInterest).toBeLessThanOrEqual(re.totalInterest + tol); // skrócenie okresu zawsze najtańsze lub równe
      expect(py.totalInterest).toBeLessThanOrEqual(re.totalInterest + tol); // piramida nigdy gorsza niż obniżanie raty
      if (loan.paymentType === 'equal') {
        // przy ratach równych piramida = skrócenie okresu (ta sama kwota co miesiąc)
        expect(py.months).toBe(sh.months);
        expect(py.totalInterest).toBeCloseTo(sh.totalInterest, 4);
      }
    }
  });

  it('w trybie zmniejszenia raty rata nigdy nie rośnie, w piramidzie płacisz stałą kwotę', () => {
    for (const { loan, ov } of cases.slice(0, 500)) {
      if (ov === 0) continue;
      const re = simulate(loan, 'reduce', ov);
      for (let i = 1; i < re.rows.length - 1; i++) expect(re.rows[i].payment).toBeLessThanOrEqual(re.rows[i - 1].payment + 1e-6);
      const py = simulate(loan, 'pyramid', ov);
      const total = py.firstPayment + ov;
      for (const row of py.rows.slice(0, -1)) expect(row.payment + row.overpayment).toBeCloseTo(total, 6);
    }
  });

  it('oszczędność i skrócenie nigdy nie są ujemne', () => {
    for (const { loan, ov } of cases.slice(0, 500)) {
      for (const st of strategies) {
        const c = compare(loan, st, ov);
        expect(c.savedInterest).toBeGreaterThanOrEqual(0);
        expect(c.monthsShorter).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
