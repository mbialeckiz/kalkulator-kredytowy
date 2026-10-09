import { describe, expect, it } from 'vitest';
import { annuityPayment, compare, groupByYear, simulate, type LoanParams } from './loan';

const flat: LoanParams = { amount: 300_000, annualRate: 6.7, termMonths: 360, paymentType: 'equal' };

describe('rata bazowa', () => {
  it('liczy ratę annuitetową', () => {
    expect(Math.round(annuityPayment(300_000, 6.7, 360))).toBe(1936);
  });

  it('bez nadpłat spłaca kredyt w umownym okresie', () => {
    const s = simulate(flat);
    expect(s.months).toBe(360);
    expect(Math.round(s.totalInterest)).toBe(396_900);
    expect(s.rows.at(-1)!.balance).toBe(0);
  });

  it('obsługuje oprocentowanie 0%', () => {
    const s = simulate({ ...flat, annualRate: 0 });
    expect(s.firstPayment).toBeCloseTo(300_000 / 360);
    expect(s.totalInterest).toBe(0);
    expect(s.months).toBe(360);
  });

  it('raty malejące: pierwsza rata = kapitał/N + odsetki', () => {
    const s = simulate({ ...flat, paymentType: 'decreasing' });
    expect(Math.round(s.firstPayment)).toBe(Math.round(300_000 / 360 + 300_000 * 0.067 / 12));
    expect(s.months).toBe(360);
    expect(s.rows.at(-1)!.balance).toBe(0);
  });
});

describe('nadpłata 1500 zł/mc (scenariusz ze screenshotów)', () => {
  it('skrócenie okresu', () => {
    const c = compare(flat, 'shorten', 1500);
    expect(c.plan.months).toBe(121); // 10 lat 1 mies.
    expect(Math.round(c.plan.totalInterest)).toBe(112_508);
    expect(Math.round(c.savedInterest)).toBe(284_392);
    expect(Math.round(c.plan.firstPayment)).toBe(1936);
  });

  it('zmniejszenie raty', () => {
    const c = compare(flat, 'reduce', 1500);
    expect(c.plan.months).toBe(177); // 14 lat 9 mies.
    expect(c.monthsShorter).toBe(183); // 15 lat 3 mies.
    expect(Math.round(c.savedInterest)).toBe(251_445);
    expect(Math.round(c.plan.lastPayment)).toBe(9);
  });

  it('piramidalna', () => {
    const c = compare(flat, 'pyramid', 1500);
    expect(c.plan.months).toBe(121);
    expect(Math.round(c.savedInterest)).toBe(284_392);
    expect(Math.round(c.plan.lastPayment)).toBe(2);
    // stała kwota miesięczna = rata startowa + nadpłata
    const r = c.plan.rows[50];
    expect(r.payment + r.overpayment).toBeCloseTo(c.plan.firstPayment + 1500);
  });
});

describe('przypadki brzegowe', () => {
  it('nadpłata większa niż saldo zamyka kredyt w 1. miesiącu', () => {
    const s = simulate({ ...flat, amount: 1000 }, 'shorten', 5000);
    expect(s.months).toBe(1);
    expect(s.rows[0].balance).toBe(0);
    expect(s.totalOverpaid).toBeLessThanOrEqual(1000);
  });

  it('roczne podsumowanie sumuje miesiące', () => {
    const s = simulate(flat, 'shorten', 1500);
    const years = groupByYear(s.rows);
    expect(years).toHaveLength(11);
    const sum = years.reduce((a, y) => a + y.interest, 0);
    expect(sum).toBeCloseTo(s.totalInterest);
  });
});

describe('rata końcowa', () => {
  it('przy skróceniu okresu zostaje równa racie startowej', () => {
    const s = simulate(flat, 'shorten', 1500);
    expect(Math.round(s.lastPayment)).toBe(1936);
  });
});
