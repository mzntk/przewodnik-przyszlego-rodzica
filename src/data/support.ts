/**
 * Katalog podmiotów o charakterze WYŁĄCZNIE charytatywnym (fundacje, stowarzyszenia) oraz telefony wsparcia.
 * Lista demonstracyjna – przed wdrożeniem do zweryfikowania przez ZUS (np. z KRS / bazą OPP).
 */
export type CharityCategory = "strata" | "wczesniactwo" | "choroba" | "psychika" | "rodzina";

export const CATEGORY_LABELS: Record<CharityCategory, string> = {
  strata: "Poronienie i strata dziecka",
  wczesniactwo: "Wcześniactwo",
  choroba: "Ciężka choroba dziecka",
  psychika: "Zdrowie psychiczne rodzica",
  rodzina: "Wsparcie rodziny",
};

export interface Charity {
  name: string;
  categories: CharityCategory[];
  description: string;
  url: string;
  phone?: string;
  form: "fundacja" | "stowarzyszenie";
}

export const CHARITIES: Charity[] = [
  { name: "Fundacja Rodzić po Ludzku", form: "fundacja", categories: ["strata", "rodzina"], description: "Prawa pacjentek w okołoporodowej opiece, materiały i wsparcie dla rodziców po poronieniu i stracie dziecka.", url: "https://rodzicpoludzku.pl" },
  { name: "Fundacja Hospicyjna", form: "fundacja", categories: ["strata", "psychika"], description: "Wsparcie osób w żałobie, w tym rodziców po stracie dziecka; bezpłatny telefon wsparcia w żałobie.", url: "https://fundacjahospicyjna.pl", phone: "800 108 108" },
  { name: "Fundacja Gajusz", form: "fundacja", categories: ["choroba", "strata"], description: "Hospicjum perinatalne i dziecięce – opieka nad rodzinami, w których dziecko jest nieuleczalnie chore jeszcze przed narodzinami.", url: "https://gajusz.org.pl" },
  { name: "Warszawskie Hospicjum dla Dzieci", form: "fundacja", categories: ["choroba", "strata"], description: "Opieka hospicyjna w domu, program perinatalny oraz wsparcie psychologiczne dla rodzin w żałobie.", url: "https://hospicjum.waw.pl" },
  { name: "Fundacja Wcześniak Rodzice–Rodzicom", form: "fundacja", categories: ["wczesniactwo"], description: "Wiedza, grupy wsparcia i pomoc dla rodziców dzieci urodzonych przedwcześnie.", url: "https://wczesniak.pl" },
  { name: "Fundacja Dzieciom „Zdążyć z Pomocą”", form: "fundacja", categories: ["choroba"], description: "Subkonta i zbiórki na leczenie i rehabilitację chorych dzieci.", url: "https://dzieciom.pl" },
  { name: "Fundacja Mam Marzenie", form: "fundacja", categories: ["choroba"], description: "Spełnianie marzeń dzieci w wieku 3–18 lat z chorobami zagrażającymi życiu.", url: "https://mammarzenie.org" },
  { name: "Fundacja ITAKA", form: "fundacja", categories: ["psychika"], description: "Antydepresyjny Telefon Zaufania i Centrum Wsparcia dla osób w stanie kryzysu psychicznego.", url: "https://itaka.org.pl", phone: "22 484 88 01" },
  { name: "Fundacja Twarze Depresji", form: "fundacja", categories: ["psychika"], description: "Edukacja i baza miejsc pomocy dla osób z depresją, w tym depresją poporodową.", url: "https://twarzedepresji.pl" },
  { name: "Fundacja Dajemy Dzieciom Siłę", form: "fundacja", categories: ["rodzina", "psychika"], description: "Wsparcie rodziców w trudnych sytuacjach wychowawczych; telefon dla rodziców i nauczycieli.", url: "https://fdds.pl", phone: "800 100 100" },
];

export const HOTLINES = [
  { name: "Infolinia ZUS (COT)", number: "22 560 16 00", note: "Pn–pt 7:00–18:00 · zasiłki, wnioski, PUE/eZUS", tone: "blue" as const },
  { name: "Numer alarmowy", number: "112", note: "Zagrożenie życia lub zdrowia", tone: "red" as const },
  { name: "Centrum Wsparcia (kryzys psychiczny)", number: "800 70 2222", note: "Całodobowo, bezpłatnie", tone: "orange" as const },
  { name: "Antydepresyjny Telefon Zaufania", number: "22 484 88 01", note: "Fundacja ITAKA", tone: "gold" as const },
  { name: "Kryzysowy Telefon Zaufania", number: "116 123", note: "Dla dorosłych w kryzysie emocjonalnym", tone: "blue" as const },
];

/** Edynburska Skala Depresji Poporodowej (EPDS; Cox, Holden, Sagovsky 1987) – polskie omówienie pytań.
 *  Punktacja 0–3; pytania z `reverse` punktowane odwrotnie. Wynik ≥ 10 – możliwe objawy, ≥ 13 – wysokie ryzyko; pytanie 10 > 0 – pilny alert. */
export const EPDS = [
  { q: "Potrafiłam się śmiać i dostrzegać zabawną stronę rzeczy", options: ["Tak często jak zwykle", "Trochę rzadziej niż zwykle", "Zdecydowanie rzadziej", "Wcale"], reverse: false },
  { q: "Z radością patrzyłam w przyszłość", options: ["Tak jak zwykle", "Trochę mniej niż zwykle", "Zdecydowanie mniej", "Prawie wcale"], reverse: false },
  { q: "Niepotrzebnie obwiniałam się, gdy coś szło źle", options: ["Tak, przez większość czasu", "Tak, czasami", "Rzadko", "Nigdy"], reverse: true },
  { q: "Byłam niespokojna lub zamartwiałam się bez wyraźnego powodu", options: ["Wcale", "Prawie wcale", "Czasami", "Bardzo często"], reverse: false },
  { q: "Odczuwałam strach lub panikę bez wyraźnego powodu", options: ["Tak, dość często", "Tak, czasami", "Rzadko", "Wcale"], reverse: true },
  { q: "Sprawy mnie przerastały", options: ["Tak, przez większość czasu nie radziłam sobie", "Czasami nie radziłam sobie tak dobrze jak zwykle", "Przeważnie radziłam sobie dobrze", "Radziłam sobie tak dobrze jak zawsze"], reverse: true },
  { q: "Byłam tak nieszczęśliwa, że miałam trudności ze snem", options: ["Tak, przez większość czasu", "Tak, czasami", "Rzadko", "Wcale"], reverse: true },
  { q: "Czułam się smutna lub przygnębiona", options: ["Tak, przez większość czasu", "Tak, dość często", "Rzadko", "Wcale"], reverse: true },
  { q: "Byłam tak nieszczęśliwa, że płakałam", options: ["Tak, przez większość czasu", "Tak, dość często", "Tylko od czasu do czasu", "Nigdy"], reverse: true },
  { q: "Przychodziła mi myśl, by zrobić sobie krzywdę", options: ["Tak, dość często", "Czasami", "Prawie nigdy", "Nigdy"], reverse: true },
];

export function scoreEpds(answers: number[]): { score: number; level: "niski" | "podwyższony" | "wysoki"; selfHarm: boolean } {
  const score = answers.reduce((s, a, i) => s + (EPDS[i].reverse ? 3 - a : a), 0);
  const selfHarm = answers[9] !== undefined && 3 - answers[9] > 0;
  return { score, level: score >= 13 ? "wysoki" : score >= 10 ? "podwyższony" : "niski", selfHarm };
}

export const OFFICIAL_LINKS = [
  { label: "ZUS – zasiłki dla rodziców", href: "https://www.zus.pl", org: "ZUS" },
  { label: "MRPiPS – urlop rodzicielski", href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", org: "MRPiPS" },
  { label: "PIP – rodzicielstwo", href: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", org: "PIP" },
  { label: "Rejestr stanu cywilnego – odpisy aktów", href: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego", org: "gov.pl" },
];

/** Wszystkie numery telefonów z aplikacji (infolinie + organizacje), bez duplikatów i bez numerów już pokazanych wyżej. */
export function allPhones(exclude: string[] = []): { name: string; number: string; note: string }[] {
  const key = (n: string) => n.replace(/\D/g, "");
  const skip = new Set(exclude.map(key));
  const out = new Map<string, { name: string; number: string; note: string }>();
  for (const h of HOTLINES) out.set(key(h.number), { name: h.name, number: h.number, note: h.note });
  for (const c of CHARITIES) if (c.phone && !out.has(key(c.phone))) out.set(key(c.phone), { name: c.name, number: c.phone, note: c.description.split(/[.;]/)[0] });
  out.set(key("800 70 2222"), out.get(key("800 70 2222")) ?? { name: "Centrum Wsparcia", number: "800 70 2222", note: "Całodobowo" });
  return [...out.entries()].filter(([k]) => !skip.has(k)).map(([, v]) => v);
}
