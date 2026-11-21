/** Walidacja identyfikatorów (PESEL, NIP, REGON) – sumy kontrolne wg specyfikacji GUS/MF. */

export function validatePesel(pesel: string): { valid: boolean; birthDate?: string; sex?: "K" | "M"; error?: string } {
  if (!/^\d{11}$/.test(pesel)) return { valid: false, error: "PESEL musi mieć 11 cyfr" };
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const d = pesel.split("").map(Number);
  const sum = w.reduce((s, wi, i) => s + wi * d[i], 0);
  const control = (10 - (sum % 10)) % 10;
  if (control !== d[10]) return { valid: false, error: "Błędna cyfra kontrolna PESEL" };
  let year = 1900 + d[0] * 10 + d[1];
  let month = d[2] * 10 + d[3];
  if (month > 80) { year -= 100; month -= 80; }
  else if (month > 60) { year += 200; month -= 60; }
  else if (month > 40) { year += 100; month -= 40; }
  else if (month > 20) { year += 100; month -= 20; }
  const day = d[4] * 10 + d[5];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return { valid: false, error: "PESEL zawiera nieistniejącą datę urodzenia" };
  return { valid: true, birthDate: date.toISOString().slice(0, 10), sex: d[9] % 2 === 0 ? "K" : "M" };
}

export function validateNip(nip: string): { valid: boolean; error?: string } {
  const clean = nip.replace(/[-\s]/g, "");
  if (!/^\d{10}$/.test(clean)) return { valid: false, error: "NIP musi mieć 10 cyfr" };
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const d = clean.split("").map(Number);
  const sum = w.reduce((s, wi, i) => s + wi * d[i], 0) % 11;
  if (sum === 10 || sum !== d[9]) return { valid: false, error: "Błędna cyfra kontrolna NIP" };
  return { valid: true };
}

export function validateRegon(regon: string): { valid: boolean; error?: string } {
  const clean = regon.replace(/\s/g, "");
  if (!/^(\d{9}|\d{14})$/.test(clean)) return { valid: false, error: "REGON musi mieć 9 lub 14 cyfr" };
  const d = clean.split("").map(Number);
  const w = clean.length === 9 ? [8, 9, 2, 3, 4, 5, 6, 7] : [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
  const c = (w.reduce((s, wi, i) => s + wi * d[i], 0) % 11) % 10;
  return c === d[d.length - 1] ? { valid: true } : { valid: false, error: "Błędna cyfra kontrolna REGON" };
}

/** Generuje poprawną cyfrę kontrolną – używane do fikcyjnych danych testowych. */
export function fixPesel(first10: string) {
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = w.reduce((s, wi, i) => s + wi * Number(first10[i]), 0);
  return first10 + ((10 - (sum % 10)) % 10);
}
export function fixNip(first9: string) {
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const c = w.reduce((s, wi, i) => s + wi * Number(first9[i]), 0) % 11;
  return c === 10 ? null : first9 + c;
}
