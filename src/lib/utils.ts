import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PLN0 = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });
export const zl = (n: number) => PLN.format(n || 0);
export const zl0 = (n: number) => PLN0.format(n || 0);
export const pct = (r: number) => `${(r * 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`;

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
const MONTHS_FULL = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
export function dShort(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
export function dLong(iso?: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS_FULL[m - 1]} ${y}`;
}
export function dPL(iso?: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
export function addDaysISO(iso: string, n: number) {
  return new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
}
export function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const l = abs % 10, l2 = abs % 100;
  return l >= 2 && l <= 4 && (l2 < 12 || l2 > 14) ? few : many;
}
