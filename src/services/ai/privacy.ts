/**
 * RODO i bezpieczeństwo funkcji AI.
 * 1) Pseudonimizacja: zanim tekst trafi do modelu, identyfikatory i dane kontaktowe zastępujemy tokenami ([PESEL_1], [NIP_1]…).
 *    Model widzi strukturę dokumentu, ale nie dane osobowe. Po odpowiedzi tokeny podmieniamy z powrotem po stronie serwera.
 * 2) Ochrona przed prompt injection w ZUSi: wykrywanie typowych prób przejęcia instrukcji, twarde limity i filtr odpowiedzi.
 */
import "server-only";

const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "EMAIL", re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { kind: "RACHUNEK", re: /\b(?:PL)?\d{2}(?:[ -]?\d{4}){6}\b/g },
  { kind: "PESEL", re: /\b\d{11}\b/g },
  { kind: "NIP", re: /\b\d{3}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}\b/g },
  { kind: "TELEFON", re: /(?:\+48[ -]?)?\b\d{3}[ -]\d{3}[ -]\d{3}\b/g },
  { kind: "SERIA_DOWODU", re: /\b[A-Z]{3}\s?\d{6}\b/g },
  // dane opisane etykietą: „Nazwisko: Kowalska”, „Imię i nazwisko: …”, „Adres zamieszkania: …”
  { kind: "OSOBA", re: /(?<=(?:imię i nazwisko|nazwisko|imię|imiona|ubezpieczon[ya]|wnioskodawca)\s*[:–-]\s*)[A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]+(?:[ ][A-ZĄĆĘŁŃÓŚŹŻ][\p{L}-]+){0,2}/giu },
  { kind: "ADRES", re: /(?<=(?:adres(?: zamieszkania| do korespondencji)?)\s*[:–-]\s*)[^\n]{5,80}/giu },
];

export interface Pseudonymized {
  text: string;
  map: Map<string, string>;
}

export function pseudonymize(input: string): Pseudonymized {
  const map = new Map<string, string>();
  const reverse = new Map<string, string>();
  const counters: Record<string, number> = {};
  let text = input;
  for (const { kind, re } of PATTERNS) {
    text = text.replace(re, (m) => {
      const key = m.trim();
      if (!key || key.startsWith("[")) return m;
      const existing = reverse.get(key);
      if (existing) return existing;
      counters[kind] = (counters[kind] ?? 0) + 1;
      const token = `[${kind}_${counters[kind]}]`;
      map.set(token, key);
      reverse.set(key, token);
      return token;
    });
  }
  return { text, map };
}

/** Przywraca oryginalne wartości w dowolnym obiekcie zwróconym przez model. */
export function restore<T>(value: T, map: Map<string, string>): T {
  if (!map.size) return value;
  const fix = (s: string) => s.replace(/\[[A-Z_]+_\d+\]/g, (t) => map.get(t) ?? t);
  const walk = (v: unknown): unknown => (typeof v === "string" ? fix(v) : Array.isArray(v) ? v.map(walk) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
  return walk(value) as T;
}

/** Ukrywa dane osobowe w wiadomości do czatu (bez przywracania – ZUSia ich nie potrzebuje). */
export function redactChat(input: string): { text: string; redacted: number } {
  const { text, map } = pseudonymize(input);
  return { text: text.replace(/\[([A-Z_]+)_\d+\]/g, "[ukryto: $1]"), redacted: map.size };
}

const INJECTION = [
  /ignoruj|zignoruj|pomiń|zapomnij|nie stosuj/i,
  /ignore|disregard|forget|override|bypass/i,
  /(poprzednie|wcześniejsze|powyższe|systemow\w*)\s+(instrukcj|polec|zasad|reguł|prompt)/i,
  /(previous|above|prior|system)\s+(instructions?|prompt|rules)/i,
  /system\s*prompt|prompt\s*systemowy|<\/?\s*(system|baza_wiedzy|instructions?)\s*>/i,
  /jesteś\s+teraz|udawaj|wciel się|you are now|act as|pretend|roleplay|jailbreak|DAN\b|developer mode|tryb deweloper/i,
  /(pokaż|wypisz|podaj|ujawnij|zdradź|reveal|print|show)\s+(swoje|twoje|your|the)?\s*(instrukcj|polecen|prompt|konfiguracj|klucz|api key)/i,
];

export function looksLikeInjection(text: string): boolean {
  const hits = INJECTION.filter((re) => re.test(text)).length;
  // pojedyncze słowo „pomiń” w pytaniu o urlop nie jest atakiem – wymagamy co najmniej dwóch sygnałów albo jawnego nadpisania roli/promptu
  return hits >= 2 || INJECTION.slice(4).some((re) => re.test(text));
}

const ALLOWED_LINK = /^\/(kalkulator|wnioski|swiadczenia|ciaza|dokumenty|wsparcie|placowki|ustawienia|panel)(?:[/?#].*)?$/;
export const safeLink = (href: string) => ALLOWED_LINK.test(href);

/** Filtr odpowiedzi: bez zewnętrznych linków, znaczników i fragmentów instrukcji systemowej. */
export function sanitizeAnswer(text: string): string {
  return text
    .replace(/<[^>]{1,40}>/g, "")
    .replace(/https?:\/\/(?!(?:www\.)?(?:zus\.pl|gov\.pl|isap\.sejm\.gov\.pl)\b)\S+/gi, "[link usunięty]")
    .replace(/baza_wiedzy|system prompt/gi, "")
    .slice(0, 2500)
    .trim();
}
