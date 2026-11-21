/** Deterministyczne operacje na datach (UTC, bez stref czasowych). */

const DAY = 86_400_000;

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(parseDate(iso).getTime() + days * DAY));
}

export function addMonths(iso: string, months: number): string {
  const d = parseDate(iso);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toISO(target);
}

export function addYears(iso: string, years: number): string {
  return addMonths(iso, years * 12);
}

/** Liczba dni pomiędzy datami (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / DAY);
}

/** Liczba dni kalendarzowych w przedziale włącznie. */
export function inclusiveDays(from: string, to: string): number {
  return diffDays(from, to) + 1;
}

export function minDate(a: string, b: string): string {
  return a < b ? a : b;
}
export function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

/** Pełne miesiące kalendarzowe ubezpieczenia przed miesiącem zdarzenia. */
export function fullCalendarMonthsBetween(startIso: string, eventIso: string): number {
  const s = parseDate(startIso);
  const e = parseDate(eventIso);
  // pierwszy pełny miesiąc: jeśli start = 1. dzień miesiąca, ten miesiąc się liczy
  const y = s.getUTCFullYear();
  let m = s.getUTCMonth();
  if (s.getUTCDate() !== 1) m += 1;
  const firstFull = y * 12 + m;
  const eventMonth = e.getUTCFullYear() * 12 + e.getUTCMonth();
  return Math.max(0, eventMonth - firstFull);
}

/** Wiek w pełnych latach na dany dzień. */
export function ageOn(birthIso: string, onIso: string): number {
  const b = parseDate(birthIso);
  const o = parseDate(onIso);
  let age = o.getUTCFullYear() - b.getUTCFullYear();
  if (o.getUTCMonth() < b.getUTCMonth() || (o.getUTCMonth() === b.getUTCMonth() && o.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export function endOfYearOfAge(birthIso: string, age: number): string {
  const b = parseDate(birthIso);
  return `${b.getUTCFullYear() + age}-12-31`;
}

const MONTHS_PL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
export function formatDatePL(iso: string): string {
  const d = parseDate(iso);
  return `${d.getUTCDate()} ${MONTHS_PL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
