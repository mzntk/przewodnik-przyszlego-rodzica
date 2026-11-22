/**
 * 100 fikcyjnych rodzin (mama + tata) do symulacji logowania przez mObywatel.
 * Generator jest deterministyczny (ta sama rodzina = te same dane), daty liczone względem dnia logowania.
 * Pierwsze 5 rodzin to ręcznie przygotowane scenariusze szczególne (wcześniaki, firma z długiem, studentka, adopcja…).
 * Dane są fikcyjne; PESEL i NIP mają poprawną sumę kontrolną, ale nie należą do realnych osób ani firm.
 */
import type { Address, CaseInput, InsuranceTitle, KidInfo, ParentProfile } from "@/models/types";
import { TEST_PROFILES, buildIncomeHistory, type TestProfile } from "./profiles";

export const FAMILY_COUNT = 100;

export interface Family {
  id: string;
  no: number;
  /** Krótki opis sytuacji – widoczny w trybie testowym */
  scenario: string;
  input: Omit<CaseInput, "asOf">;
  ezusMessages?: { from: string; date: string; text: string }[];
}

// ---------- narzędzia ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type R = () => number;
const int = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pick = <T,>(r: R, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const chance = (r: R, p: number) => r() < p;
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
const round = (n: number, step: number) => Math.round(n / step) * step;

function pesel(r: R, birth: string, female: boolean) {
  const [y, m, d] = birth.split("-").map(Number);
  const mm = m + (y >= 2000 ? 20 : 0);
  const serial = String(int(r, 0, 999)).padStart(3, "0");
  const sex = female ? pick(r, [0, 2, 4, 6, 8]) : pick(r, [1, 3, 5, 7, 9]);
  const base = `${String(y % 100).padStart(2, "0")}${String(mm).padStart(2, "0")}${String(d).padStart(2, "0")}${serial}${sex}`;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = base.split("").reduce((s, c, i) => s + Number(c) * w[i], 0);
  return base + ((10 - (sum % 10)) % 10);
}

function nip(r: R) {
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  for (;;) {
    const digits = [int(r, 1, 9), ...Array.from({ length: 8 }, () => int(r, 0, 9))];
    const c = digits.reduce((s, x, i) => s + x * w[i], 0) % 11;
    if (c < 10) return digits.join("") + c;
  }
}

function regon(r: R) {
  const w = [8, 9, 2, 3, 4, 5, 6, 7];
  const d = Array.from({ length: 8 }, (_, i) => (i === 0 ? int(r, 1, 9) : int(r, 0, 9)));
  return d.join("") + ((d.reduce((s, x, i) => s + x * w[i], 0) % 11) % 10);
}

/** NRB (26 cyfr) z poprawną cyfrą kontrolną IBAN (mod 97) – fikcyjny numer konta. */
function nrb(r: R) {
  const bban = Array.from({ length: 24 }, () => int(r, 0, 9)).join("");
  const num = `${bban}252100`; // „PL” = 25 21
  let mod = 0;
  for (const ch of num) mod = (mod * 10 + Number(ch)) % 97;
  return String(98 - mod).padStart(2, "0") + bban;
}

/** Seria i numer dowodu osobistego (AAA + cyfra kontrolna + 5 cyfr), z poprawną cyfrą kontrolną. */
function idCard(r: R) {
  const L = "ABCDEFGHIJKLMNOPRSTUVWXYZ";
  const letters = Array.from({ length: 3 }, () => L[int(r, 0, L.length - 1)]);
  const digits = Array.from({ length: 5 }, () => int(r, 0, 9));
  const v = (c: string) => c.charCodeAt(0) - 55; // A=10
  const S = letters.reduce((s, c, i) => s + v(c) * [7, 3, 1][i], 0) + digits.reduce((s, d, i) => s + d * [7, 3, 1, 7, 3][i], 0);
  return `${letters.join("")}${S % 10}${digits.join("")}`;
}

const CITIES: { city: string; postal: string; commune: string; hospital: string }[] = [
  { city: "Warszawa", postal: "02", commune: "Warszawa", hospital: "Szpital Specjalistyczny im. św. Zofii" },
  { city: "Kraków", postal: "31", commune: "Kraków", hospital: "Szpital Uniwersytecki" },
  { city: "Gdańsk", postal: "80", commune: "Gdańsk", hospital: "Szpital Św. Wojciecha" },
  { city: "Wrocław", postal: "53", commune: "Wrocław", hospital: "Szpital Specjalistyczny im. A. Falkiewicza" },
  { city: "Poznań", postal: "61", commune: "Poznań", hospital: "Ginekologiczno-Położniczy Szpital Kliniczny" },
  { city: "Łódź", postal: "93", commune: "Łódź", hospital: "Centrum Zdrowia Matki Polki" },
  { city: "Lublin", postal: "20", commune: "Lublin", hospital: "Szpital Kliniczny nr 4" },
  { city: "Katowice", postal: "40", commune: "Katowice", hospital: "Szpital Specjalistyczny nr 2" },
  { city: "Białystok", postal: "15", commune: "Białystok", hospital: "Uniwersytecki Szpital Kliniczny" },
  { city: "Rzeszów", postal: "35", commune: "Rzeszów", hospital: "Szpital Wojewódzki nr 1" },
  { city: "Toruń", postal: "87", commune: "Toruń", hospital: "Szpital Miejski" },
  { city: "Olsztyn", postal: "10", commune: "Olsztyn", hospital: "Szpital Wojewódzki" },
];
const STREETS = ["Lipowa", "Słoneczna", "Kwiatowa", "Polna", "Leśna", "Ogrodowa", "Szkolna", "Długa", "Mickiewicza", "Kościuszki", "Sienkiewicza", "Akacjowa", "Brzozowa", "Klonowa", "Parkowa", "Łąkowa", "Wiosenna", "Spacerowa"];
const BUSINESS = ["Usługi Graficzne", "Pracownia Krawiecka", "Doradztwo IT", "Biuro Tłumaczeń", "Studio Fotografii", "Gabinet Fizjoterapii", "Usługi Księgowe", "Pracownia Ceramiki"];

function address(r: R, c = pick(r, CITIES)): Address {
  const postal = c.postal + Array.from({ length: 3 }, () => int(r, 0, 9)).join("");
  return { street: `ul. ${pick(r, STREETS)}`, house: String(int(r, 1, 120)), flat: chance(r, 0.6) ? String(int(r, 1, 60)) : undefined, postalCode: `${postal.slice(0, 2)}-${postal.slice(2)}`, city: c.city, commune: c.commune };
}
const phone = (r: R) => `${pick(r, [5, 6, 7, 8])}${int(r, 0, 9)}${int(r, 0, 9)} ${int(r, 100, 999)} ${int(r, 100, 999)}`;
const ascii = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").toLowerCase();

/** PESEL dziecka urodzonego w danym dniu (płeć z danych dziecka). */
const childPesel = (r: R, birth: string, sex: KidInfo["sex"]) => pesel(r, birth, sex !== "chlopiec");

/**
 * Dane potrzebne do pełnego wypełnienia wniosków: adres, telefon, e-mail, rachunek, dowód,
 * REGON i adres płatnika, dane własnej firmy, PESEL i miejsce urodzenia dzieci. Uzupełnia tylko brakujące pola.
 */
function enrich(input: Omit<CaseInput, "asOf">, no: number): Omit<CaseInput, "asOf"> {
  const r = rng(no * 104729 + 7);
  const c = pick(r, CITIES);
  const home = address(r, c);
  const fill = (p: ParentProfile | undefined) => {
    if (!p) return;
    p.address ??= { ...home };
    p.phone ??= phone(r);
    p.email ??= `${ascii(p.firstName)}.${ascii(p.lastName)}${int(r, 1, 99)}@poczta.example`;
    p.bankAccount ??= nrb(r);
    p.idDocument ??= idCard(r);
    if (p.payer) {
      p.payer.regon ??= regon(r);
      p.payer.address ??= address(r, chance(r, 0.7) ? c : pick(r, CITIES));
      p.payer.phone ??= phone(r);
    }
    if (["jdg", "jdg_preferencyjna", "maly_zus_plus", "ulga_na_start"].includes(p.title)) p.business ??= { name: `${pick(r, BUSINESS)} ${p.firstName} ${p.lastName}`, nip: nip(r), regon: regon(r), address: { ...home } };
  };
  fill(input.mother);
  fill(input.father);
  const ch = input.child;
  if (ch.birthDate && ch.kids) {
    ch.kids = ch.kids.map((k, i) => ({
      ...k,
      pesel: k.pesel ?? childPesel(r, ch.birthDate!, k.sex),
      birthPlace: k.birthPlace ?? `${c.hospital}, ${c.city}`,
      weightG: k.weightG ?? ch.birthWeightsG?.[i] ?? int(r, 2800, 4100),
      birthTime: k.birthTime ?? `${String(int(r, 0, 23)).padStart(2, "0")}:${String(int(r, 0, 59)).padStart(2, "0")}`,
    }));
  }
  return input;
}

// ---------- słowniki ----------
const FEMALE = ["Anna", "Katarzyna", "Magdalena", "Agnieszka", "Joanna", "Aleksandra", "Natalia", "Karolina", "Paulina", "Monika", "Marta", "Ewa", "Julia", "Zuzanna", "Weronika", "Kinga", "Patrycja", "Justyna", "Dominika", "Sylwia", "Martyna", "Gabriela", "Oliwia", "Klaudia", "Izabela", "Emilia", "Wiktoria", "Alicja", "Kamila", "Daria"];
const MALE = ["Piotr", "Tomasz", "Paweł", "Michał", "Krzysztof", "Marcin", "Łukasz", "Jakub", "Adam", "Mateusz", "Kamil", "Bartosz", "Grzegorz", "Rafał", "Dawid", "Szymon", "Patryk", "Wojciech", "Maciej", "Sebastian", "Daniel", "Filip", "Karol", "Kacper", "Adrian", "Marek", "Damian", "Hubert", "Igor", "Jan"];
const SURNAMES: [string, string][] = [["Nowak", "Nowak"], ["Kowalski", "Kowalska"], ["Wiśniewski", "Wiśniewska"], ["Wójcik", "Wójcik"], ["Kowalczyk", "Kowalczyk"], ["Kamiński", "Kamińska"], ["Lewandowski", "Lewandowska"], ["Zieliński", "Zielińska"], ["Szymański", "Szymańska"], ["Woźniak", "Woźniak"], ["Dąbrowski", "Dąbrowska"], ["Kozłowski", "Kozłowska"], ["Jankowski", "Jankowska"], ["Mazur", "Mazur"], ["Kwiatkowski", "Kwiatkowska"], ["Krawczyk", "Krawczyk"], ["Piotrowski", "Piotrowska"], ["Grabowski", "Grabowska"], ["Nowakowski", "Nowakowska"], ["Pawłowski", "Pawłowska"], ["Michalski", "Michalska"], ["Adamczyk", "Adamczyk"], ["Dudek", "Dudek"], ["Zając", "Zając"], ["Wieczorek", "Wieczorek"], ["Jabłoński", "Jabłońska"], ["Król", "Król"], ["Majewski", "Majewska"], ["Olszewski", "Olszewska"], ["Stępień", "Stępień"]];
const BABY_GIRL = ["Zosia", "Hania", "Lena", "Maja", "Julia", "Laura", "Alicja", "Oliwia", "Pola", "Nina", "Ania", "Mila"];
const BABY_BOY = ["Antoś", "Staś", "Jaś", "Franek", "Kuba", "Leon", "Tymek", "Ignaś", "Miłosz", "Wojtek", "Filip", "Henio"];
const FULL: Record<string, string> = { Zosia: "Zofia", Hania: "Hanna", Ania: "Anna", Antoś: "Antoni", Staś: "Stanisław", Jaś: "Jan", Franek: "Franciszek", Kuba: "Jakub", Tymek: "Tymoteusz", Ignaś: "Ignacy", Wojtek: "Wojciech", Henio: "Henryk" };
const SMALL = ["Biuro Rachunkowe „Saldo”", "Kwiaciarnia „Pod Lipą”", "Gabinet Stomatologiczny Uśmiech", "Pracownia Architektoniczna Linia", "Piekarnia Rodzinna Kłos", "Studio Fryzjerskie Nożyczki", "Kancelaria Radcy Prawnego", "Przedszkole Niepubliczne Promyk", "Sklep Rowerowy Szprycha", "Agencja Reklamowa Pixel"];
const LARGE = ["Bank Polski S.A.", "LogiTrans Polska S.A.", "Szpital Wojewódzki", "Urząd Miasta", "TechSoft Sp. z o.o.", "Sieć Handlowa Koszyk S.A.", "Politechnika", "Energa-Sieć S.A.", "Fabryka Mebli Dąb S.A.", "Centrum Obsługi Biznesu Sp. z o.o."];
const ZUS_ODDZIAL = ["ZUS I Oddział w Warszawie", "ZUS Oddział w Krakowie", "ZUS Oddział w Gdańsku", "ZUS Oddział we Wrocławiu", "ZUS Oddział w Poznaniu", "ZUS I Oddział w Łodzi"];

// ---------- rodzic ----------
function parent(r: R, role: "matka" | "ojciec", lastName: [string, string], today: string, title: InsuranceTitle): ParentProfile {
  const female = role === "matka";
  const birthDate = `${int(r, female ? 1987 : 1983, female ? 2003 : 2001)}-${String(int(r, 1, 12)).padStart(2, "0")}-${String(int(r, 1, 28)).padStart(2, "0")}`;
  const month = today.slice(0, 7);
  const jdg = ["jdg", "jdg_preferencyjna", "maly_zus_plus", "ulga_na_start"].includes(title);
  const shortJdg = jdg && chance(r, 0.25);
  const insuranceStart = addDays(today, -(shortJdg ? int(r, 120, 330) : title === "student_zlecenie" || title === "brak" ? int(r, 60, 400) : int(r, 200, 3000)));
  const large = chance(r, female ? 0.45 : 0.6);
  const gross =
    title === "uop" ? round(int(r, 4806, female ? 13000 : 16000), 50)
    : title === "zlecenie" || title === "student_zlecenie" ? round(int(r, 2800, 8500), 50)
    : title === "jdg" ? round(int(r, 5652, chance(r, 0.3) ? 15000 : 7000), 10)
    : title === "jdg_preferencyjna" ? 1441.8
    : title === "maly_zus_plus" ? round(int(r, 1500, 3500), 10)
    : title === "ulga_na_start" ? 0
    : 0;
  return {
    firstName: pick(r, female ? FEMALE : MALE),
    lastName: female ? lastName[1] : lastName[0],
    pesel: pesel(r, birthDate, female),
    role,
    birthDate,
    title,
    voluntarySickness: title === "zlecenie" ? chance(r, 0.85) : jdg ? chance(r, 0.8) : false,
    insuranceStart,
    payer: title === "uop" || title === "zlecenie" || title === "student_zlecenie" ? { name: large ? pick(r, LARGE) : pick(r, SMALL), nip: nip(r), insuredCount: large ? int(r, 21, 1500) : int(r, 2, 20) } : undefined,
    workTimeFraction: title === "uop" && chance(r, 0.12) ? pick(r, [0.5, 0.75]) : 1,
    incomeHistory: gross ? buildIncomeHistory(month, 12, gross) : [],
    declaredBase: jdg ? gross : undefined,
    sickLeaves: [],
  };
}

const MOTHER_TITLES: [InsuranceTitle, number][] = [["uop", 0.6], ["zlecenie", 0.14], ["jdg", 0.1], ["jdg_preferencyjna", 0.04], ["maly_zus_plus", 0.03], ["student_zlecenie", 0.05], ["brak", 0.04]];
const FATHER_TITLES: [InsuranceTitle, number][] = [["uop", 0.74], ["jdg", 0.14], ["zlecenie", 0.08], ["brak", 0.04]];
const weighted = (r: R, xs: [InsuranceTitle, number][]) => {
  let x = r();
  for (const [t, w] of xs) if ((x -= w) < 0) return t;
  return xs[0][0];
};

function kidsFor(r: R, n: number, born: boolean, surname: [string, string]): KidInfo[] {
  return Array.from({ length: n }, () => {
    const knowSex = born || chance(r, 0.6);
    const girl = chance(r, 0.5);
    const sex: KidInfo["sex"] = knowSex ? (girl ? "dziewczynka" : "chlopiec") : "nie_wiem";
    const name = knowSex && (born || chance(r, 0.6)) ? pick(r, girl ? BABY_GIRL : BABY_BOY) : undefined;
    return { sex, name, ...(born && name ? { fullName: FULL[name] ?? name, lastName: girl ? surname[1] : surname[0] } : {}) };
  });
}

function generate(no: number, today: string): Family {
  const r = rng(no * 7919 + 13);
  const ln = pick(r, SURNAMES);
  const mother = parent(r, "matka", ln, today, weighted(r, MOTHER_TITLES));
  const father = parent(r, "ojciec", ln, today, weighted(r, FATHER_TITLES));
  // zdecydowana większość: narodziny; adopcję i rodzinę zastępczą można też wybrać przy rejestracji
  const pathRoll = r();
  const path = pathRoll < 0.9 ? "biologiczny" : pathRoll < 0.96 ? "adopcja" : "rodzina_zastepcza";
  const born = path === "biologiczny" && chance(r, 0.2);
  const count = path === "biologiczny" && chance(r, 0.06) ? 2 : 1;
  const preemie = born && chance(r, 0.25);
  const birthDate = born ? addDays(today, -int(r, 4, 110)) : undefined;
  const dueDate = path !== "biologiczny" ? addDays(today, int(r, 10, 120)) : born ? addDays(birthDate!, preemie ? int(r, 21, 90) : int(r, -10, 10)) : addDays(today, int(r, 14, 230));
  const gestationWeek = preemie ? int(r, 26, 35) : undefined;
  const kids = kidsFor(r, count, born, ln);

  // zwolnienia z kodem B w ciąży, zadłużenie w firmie, umowa terminowa
  if (!born && path === "biologiczny" && mother.title !== "brak" && chance(r, 0.45)) {
    const from = addDays(today, -int(r, 10, 80));
    mother.sickLeaves.push({ id: "z1", from, to: addDays(from, int(r, 13, 60)), codeB: true, issuer: "lekarz ginekolog", diagnosis: "O26" });
  }
  if (["jdg", "maly_zus_plus", "jdg_preferencyjna"].includes(mother.title) && chance(r, 0.3)) {
    mother.contributionDebt = round(int(r, 60, 1200), 1) + 0.45;
    mother.debtCheckDate = today;
  }
  if (mother.title === "uop" && !born && chance(r, 0.1)) mother.contractEndDate = addDays(today, int(r, 20, 120));

  const fatherWeeks = chance(r, 0.6) ? 9 : 0;
  const input: Omit<CaseInput, "asOf"> = {
    mother,
    father,
    child: {
      path,
      dueDate,
      birthDate,
      childrenCount: count,
      zaZyciem: chance(r, 0.02),
      kids,
      ...(path === "biologiczny" ? { delivery: chance(r, 0.35) ? "cesarskie" : "naturalny" } : {}),
      ...(preemie ? { gestationWeek, birthWeightsG: kids.map(() => int(r, 850, 2300)), hospitalizationDays: kids.map(() => int(r, 10, 60)), hospitalizationStartDay: 1 } : {}),
      ...(path !== "biologiczny" ? { childAgeYears: path === "adopcja" ? int(r, 0, 12) : int(r, 0, 6) } : {}),
    },
    plan: {
      variant: chance(r, 0.4) ? "combined" : "standard",
      motherParentalWeeks: (count > 1 ? 43 : 41) - fatherWeeks,
      fatherParentalWeeks: fatherWeeks,
      simultaneous: false,
      combineWithWork: { enabled: mother.title === "uop" && chance(r, 0.12), who: "matka", fraction: 0.5, weeks: 16 },
      paternity: { enabled: father.title !== "brak", split: chance(r, 0.7) ? "jednorazowo" : "2x7" },
      parentalParts: int(r, 1, 3),
      maternityStartBeforeBirthWeeks: 0,
      usedParentalInFirstYear: true,
    },
    family: { householdSize: 3 + (chance(r, 0.35) ? int(r, 1, 2) : 0), monthlyNetIncomeTotal: round(int(r, 4500, 22000), 100), aktywnyRodzicOption: pick(r, ["praca", "zlobek", "dom"] as const), bothParentsWorking: father.title !== "brak" && mother.title !== "brak" },
  };

  const kind = path === "adopcja" ? "adopcja" : path === "rodzina_zastepcza" ? "rodzina zastępcza" : born ? (preemie ? "wcześniak po porodzie" : "po porodzie") : `${Math.max(4, 40 - Math.ceil((Date.parse(dueDate) - Date.parse(today)) / 604_800_000))}. tydz. ciąży`;
  const work = { uop: (mother.payer?.insuredCount ?? 0) > 20 ? "etat w dużej firmie" : "etat w małej firmie", zlecenie: "zlecenie", jdg: "własna firma", jdg_preferencyjna: "firma – preferencyjny ZUS", maly_zus_plus: "firma – Mały ZUS+", ulga_na_start: "firma – ulga na start", nierejestrowa: "działalność nierejestrowa", student_zlecenie: "studentka na zleceniu", brak: "bez ubezpieczenia" }[mother.title];
  const messages: Family["ezusMessages"] = [];
  const oddzial = pick(r, ZUS_ODDZIAL);
  if (mother.contributionDebt) messages.push({ from: oddzial, date: addDays(today, -int(r, 2, 20)), text: `Informujemy o zaległości w składkach w kwocie ${mother.contributionDebt.toFixed(2).replace(".", ",")} zł. Spłata całości jest warunkiem wypłaty zasiłków (art. 2a ustawy zasiłkowej).` });
  if (born) messages.push({ from: oddzial, date: addDays(birthDate!, int(r, 3, 12)), text: "Otrzymaliśmy informację o urodzeniu dziecka z rejestru stanu cywilnego. Jeśli zasiłek wypłaca ZUS, nie musisz dołączać odpisu aktu urodzenia." });

  return {
    id: `rodzina-${String(no).padStart(3, "0")}`,
    no,
    scenario: `${work}${mother.contributionDebt ? " z zaległością" : ""} · ${kind}${count > 1 ? " · bliźnięta" : ""}`,
    input,
    ezusMessages: messages,
  };
}

/** Ręczne scenariusze szczególne jako rodziny 1–5 (z dopisanym tatą tam, gdzie go brakowało). */
function fromProfile(p: TestProfile, no: number, today: string): Family {
  const input = structuredClone(p.input);
  const male = (f: string) => f.replace(/ska$/, "ski").replace(/cka$/, "cki").replace(/dzka$/, "dzki");
  if (!input.father) {
    const r = rng(no * 31);
    input.father = parent(r, "ojciec", [male(input.mother.lastName), input.mother.lastName], today, p.id === "julia-student" ? "zlecenie" : "uop");
  }
  const KIDS: Record<string, KidInfo[]> = {
    "nowak-wczesniaki": [
      { sex: "dziewczynka", name: "Hania", fullName: "Hanna", lastName: "Nowak", weightG: 940, birthPlace: "Szpital Specjalistyczny im. św. Zofii, Warszawa" },
      { sex: "chlopiec", name: "Staś", fullName: "Stanisław", lastName: "Nowak", weightG: 1080, birthPlace: "Szpital Specjalistyczny im. św. Zofii, Warszawa" },
    ],
    "lis-adopcja": [{ sex: "chlopiec", name: "Kubuś", fullName: "Jakub", lastName: "Lis" }],
    "anna-uop": [{ sex: "dziewczynka", name: "Zosia" }],
  };
  input.child.kids ??= KIDS[p.id] ?? Array.from({ length: input.child.childrenCount }, () => ({ sex: "nie_wiem" as const }));
  return { id: p.id, no, scenario: p.subtitle, input, ezusMessages: p.ezusMessages };
}

const cache = new Map<string, Family>();

/** Rodzina o numerze 1–100 (1–5: scenariusze szczególne). */
export function familyByNo(no: number, today = new Date().toISOString().slice(0, 10)): Family {
  const key = `${no}|${today}`;
  let f = cache.get(key);
  if (!f) {
    f = no <= TEST_PROFILES.length ? fromProfile(TEST_PROFILES[no - 1], no, today) : generate(no, today);
    f.input = enrich(f.input, no);
    cache.set(key, f);
  }
  return f;
}

export function getFamily(id: string | null | undefined, today?: string): Family | undefined {
  if (!id) return undefined;
  const idx = TEST_PROFILES.findIndex((p) => p.id === id);
  if (idx >= 0) return familyByNo(idx + 1, today);
  const m = /^rodzina-(\d{3})$/.exec(id);
  return m ? familyByNo(Number(m[1]), today) : undefined;
}

export const randomFamilyNo = (except?: number) => {
  let n = 1 + Math.floor(Math.random() * FAMILY_COUNT);
  if (n === except) n = (n % FAMILY_COUNT) + 1;
  return n;
};

/** Opis scenariuszy w puli – do dymka ⓘ w trybie testowym. */
export const SCENARIO_INFO = [
  "ok. 90% – narodziny (w tym ok. 20% już po porodzie, wcześniaki i bliźnięta), ok. 10% – adopcja i rodzina zastępcza",
  "mamy: etat w małej (zasiłek wypłaca ZUS) i dużej firmie (płaci pracodawca), zlecenie, własna firma, Mały ZUS+, studentka bez ubezpieczenia, brak ubezpieczenia",
  "część firm z zaległością w składkach (blokada wypłaty), zwolnienia L4 z kodem B, umowy na czas określony, łączenie urlopu z pracą",
  "rodziny 1–5: przygotowane scenariusze szczególne – wcześniaki bliźnięta, firma z długiem, studentka, adopcja 3-latka, etat w małej firmie",
];

/** Uzupełnia dane zapisane na urządzeniu o nowe pola z profilu rodziny (adres, rachunek, REGON…), nie nadpisując wpisów użytkownika. */
export function completeFromFamily<T extends Pick<CaseInput, "mother" | "father" | "child">>(data: T, fam: Family): T {
  const out = structuredClone(data);
  const copy = (p: ParentProfile | undefined, src: ParentProfile | undefined) => {
    if (!p || !src) return;
    p.address ??= src.address;
    p.phone ??= src.phone;
    p.email ??= src.email;
    p.bankAccount ??= src.bankAccount;
    p.idDocument ??= src.idDocument;
    if (p.title === src.title) p.business ??= src.business;
    if (p.payer && src.payer && p.payer.nip === src.payer.nip) {
      p.payer.regon ??= src.payer.regon;
      p.payer.address ??= src.payer.address;
      p.payer.phone ??= src.payer.phone;
    }
  };
  copy(out.mother, fam.input.mother);
  copy(out.father, fam.input.father);
  if (out.child.birthDate && out.child.birthDate === fam.input.child.birthDate && out.child.kids && fam.input.child.kids)
    out.child.kids = out.child.kids.map((k, i) => ({ ...fam.input.child.kids?.[i], ...Object.fromEntries(Object.entries(k).filter(([, v]) => v !== undefined && v !== "")) }));
  return out;
}
