/**
 * Zanonimizowane profile testowe do 3-minutowego demo (symulacja danych z mObywatel / PUE ZUS).
 * Dane osobowe są fikcyjne; numery PESEL mają poprawną sumę kontrolną, ale nie należą do realnych osób.
 */
import type { CaseInput, MonthIncome, ParentProfile } from "@/models/types";

function history(lastMonth: string, n: number, gross: number, overrides: Partial<Record<string, Partial<MonthIncome>>> = {}): MonthIncome[] {
  const [y, m] = lastMonth.split("-").map(Number);
  const out: MonthIncome[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    out.push({ month: key, gross, fixedContract: gross, workedDays: 21, requiredDays: 21, ...overrides[key] });
  }
  return out;
}

const basePlan: CaseInput["plan"] = {
  variant: "standard",
  motherParentalWeeks: 32,
  fatherParentalWeeks: 9,
  simultaneous: false,
  combineWithWork: { enabled: false, who: "matka", fraction: 0.5, weeks: 0 },
  paternity: { enabled: true, split: "jednorazowo" },
  parentalParts: 2,
  maternityStartBeforeBirthWeeks: 0,
  usedParentalInFirstYear: true,
};

const baseFamily: CaseInput["family"] = { householdSize: 3, monthlyNetIncomeTotal: 9800, aktywnyRodzicOption: "praca", bothParentsWorking: true };

export interface TestProfile {
  id: string;
  title: string;
  subtitle: string;
  tags: { label: string; tone: "blue" | "green" | "orange" | "gold" | "red" }[];
  avatar: string;
  input: Omit<CaseInput, "asOf">;
  ezusMessages?: { from: string; date: string; text: string }[];
}

const piotr: ParentProfile = {
  firstName: "Piotr",
  lastName: "Kowalczyk",
  pesel: "89031512359",
  role: "ojciec",
  birthDate: "1989-03-15",
  title: "uop",
  voluntarySickness: false,
  insuranceStart: "2019-02-01",
  payer: { name: "LogiTrans Polska S.A.", nip: "5272829175", insuredCount: 312 },
  workTimeFraction: 1,
  incomeHistory: history("2026-11", 12, 9200),
  sickLeaves: [],
};

export const TEST_PROFILES: TestProfile[] = [
  {
    id: "anna-uop",
    title: "Anna – UoP w małej firmie",
    subtitle: "Etat w biurze rachunkowym (12 osób) · L4 z kodem B · łączy rodzicielski z pracą na 1/2 etatu",
    avatar: "AK",
    tags: [
      { label: "Płatnik: ZUS", tone: "blue" },
      { label: "Kod B", tone: "green" },
      { label: "Praca + urlop", tone: "gold" },
    ],
    input: {
      mother: {
        firstName: "Anna",
        lastName: "Kowalczyk",
        pesel: "92071808463",
        role: "matka",
        birthDate: "1992-07-18",
        title: "uop",
        voluntarySickness: false,
        insuranceStart: "2021-03-01",
        payer: { name: "Biuro Rachunkowe „Bilans” Sp. z o.o.", nip: "6762481231", insuredCount: 12 },
        workTimeFraction: 1,
        incomeHistory: history("2026-08", 12, 7800, {
          "2026-03": { gross: 5200, workedDays: 14, requiredDays: 22 },
          "2026-06": { gross: 2900, workedDays: 8, requiredDays: 21 },
        }),
        quarterlyBonuses: 3600,
        sickLeaves: [
          { id: "z1", from: "2026-09-08", to: "2026-09-19", codeB: false, issuer: "lek. Marta Sowa", diagnosis: "J06" },
          { id: "z2", from: "2026-10-13", to: "2026-12-31", codeB: true, issuer: "lek. Jan Wrona (ginekolog)", diagnosis: "O26" },
        ],
      },
      father: piotr,
      child: { path: "biologiczny", dueDate: "2027-01-15", childrenCount: 1, delivery: "naturalny", zaZyciem: false },
      plan: { ...basePlan, motherParentalWeeks: 32, fatherParentalWeeks: 9, combineWithWork: { enabled: true, who: "matka", fraction: 0.5, weeks: 16 } },
      family: baseFamily,
    },
    ezusMessages: [
      { from: "ZUS I Oddział w Warszawie", date: "2026-10-20", text: "Otrzymaliśmy Z-3 od płatnika Biuro Rachunkowe „Bilans”. Wypłata zasiłku chorobowego za okres od 14.11.2026 nastąpi na rachunek wskazany w PUE." },
    ],
  },
  {
    id: "magda-jdg",
    title: "Magdalena – JDG z zadłużeniem",
    subtitle: "Grafik freelancerka · działalność od 6 mies. (art. 48a) · zaległość składkowa 312,45 zł",
    avatar: "MW",
    tags: [
      { label: "Blokada art. 2a", tone: "red" },
      { label: "Staż < 12 mies.", tone: "orange" },
      { label: "Płatnik: ZUS", tone: "blue" },
    ],
    input: {
      mother: {
        firstName: "Magdalena",
        lastName: "Wiśniewska",
        pesel: "95112203289",
        role: "matka",
        birthDate: "1995-11-22",
        title: "jdg",
        voluntarySickness: true,
        insuranceStart: "2026-05-01",
        workTimeFraction: 1,
        declaredBase: 9000,
        incomeHistory: history("2026-12", 8, 9000),
        contributionDebt: 312.45,
        debtCheckDate: "2026-11-20",
        sickLeaves: [{ id: "z1", from: "2026-08-03", to: "2026-08-21", codeB: true, issuer: "lek. Ewa Lis", diagnosis: "O21" }],
      },
      child: { path: "biologiczny", dueDate: "2027-01-30", childrenCount: 1, zaZyciem: false },
      plan: { ...basePlan, fatherParentalWeeks: 0, paternity: { enabled: false, split: "jednorazowo" } },
      family: { householdSize: 2, monthlyNetIncomeTotal: 3600, aktywnyRodzicOption: "dom", bothParentsWorking: false },
    },
    ezusMessages: [
      { from: "ZUS Oddział w Krakowie", date: "2026-11-18", text: "Informujemy o zaległości w składkach na ubezpieczenia społeczne za 10/2026 w kwocie 312,45 zł. Spłata całości jest warunkiem wypłaty zasiłków (art. 2a ustawy zasiłkowej)." },
    ],
  },
  {
    id: "nowak-wczesniaki",
    title: "Karolina i Tomasz – wcześniaki",
    subtitle: "Bliźnięta z 27. tyg. (940 g / 1080 g) · hospitalizacja 52 dni · wariant 81,5% · podział urlopu",
    avatar: "KN",
    tags: [
      { label: "Uzupełniający", tone: "gold" },
      { label: "81,5%", tone: "gold" },
      { label: "Płatnik: pracodawca", tone: "green" },
    ],
    input: {
      mother: {
        firstName: "Karolina",
        lastName: "Nowak",
        pesel: "90042507142",
        role: "matka",
        birthDate: "1990-04-25",
        title: "uop",
        voluntarySickness: false,
        insuranceStart: "2016-09-01",
        payer: { name: "Medisoft Technologies S.A.", nip: "5213692579", insuredCount: 450 },
        workTimeFraction: 1,
        incomeHistory: history("2026-07", 12, 11400),
        annualBonus: 9000,
        sickLeaves: [{ id: "z1", from: "2026-08-17", to: "2026-10-27", codeB: true, issuer: "dr Adam Kos", diagnosis: "O60" }],
      },
      father: {
        firstName: "Tomasz",
        lastName: "Nowak",
        pesel: "88121004570",
        role: "ojciec",
        birthDate: "1988-12-10",
        title: "uop",
        voluntarySickness: false,
        insuranceStart: "2014-01-01",
        payer: { name: "Pracownia Architektoniczna Forma", nip: "7792415587", insuredCount: 9 },
        workTimeFraction: 1,
        incomeHistory: history("2026-09", 12, 8600),
        sickLeaves: [],
      },
      child: {
        path: "biologiczny",
        dueDate: "2027-01-08",
        birthDate: "2026-10-28",
        childrenCount: 2,
        delivery: "cesarskie",
        zaZyciem: false,
        gestationWeek: 27,
        birthWeightsG: [940, 1080],
        hospitalizationDays: [52, 38],
        hospitalizationStartDay: 1,
      },
      plan: { ...basePlan, variant: "combined", motherParentalWeeks: 18, fatherParentalWeeks: 16, simultaneous: false, parentalParts: 3 },
      family: { householdSize: 4, monthlyNetIncomeTotal: 14200, aktywnyRodzicOption: "zlobek", nurseryFee: 1800, bothParentsWorking: true },
    },
  },
  {
    id: "julia-student",
    title: "Julia – studentka na zleceniu",
    subtitle: "22 lata, umowa zlecenia w kawiarni · brak ubezpieczenia → świadczenie rodzicielskie",
    avatar: "JZ",
    tags: [
      { label: "Brak ubezpieczenia", tone: "red" },
      { label: "Kosiniakowe", tone: "gold" },
    ],
    input: {
      mother: {
        firstName: "Julia",
        lastName: "Zielińska",
        pesel: "04251707646",
        role: "matka",
        birthDate: "2004-05-17",
        title: "student_zlecenie",
        voluntarySickness: false,
        insuranceStart: "2025-10-01",
        payer: { name: "Kawiarnia Ziarno s.c.", nip: "9542781197", insuredCount: 4 },
        workTimeFraction: 1,
        incomeHistory: history("2026-10", 6, 2100),
        sickLeaves: [],
      },
      child: { path: "biologiczny", dueDate: "2027-03-10", childrenCount: 1, zaZyciem: false },
      plan: { ...basePlan, fatherParentalWeeks: 0, paternity: { enabled: false, split: "jednorazowo" } },
      family: { householdSize: 2, monthlyNetIncomeTotal: 2900, aktywnyRodzicOption: "dom", bothParentsWorking: false },
    },
  },
  {
    id: "lis-adopcja",
    title: "Ewa i Marek – adopcja 3-latka",
    subtitle: "Zlecenie z dobrowolnym chorobowym · urlop na warunkach macierzyńskiego",
    avatar: "EL",
    tags: [
      { label: "Adopcja", tone: "blue" },
      { label: "Zlecenie", tone: "orange" },
    ],
    input: {
      mother: {
        firstName: "Ewa",
        lastName: "Lis",
        pesel: "87060912340",
        role: "matka",
        birthDate: "1987-06-09",
        title: "zlecenie",
        voluntarySickness: true,
        insuranceStart: "2023-02-01",
        payer: { name: "Fundacja Edukacja Bez Granic", nip: "8992734412", insuredCount: 27 },
        workTimeFraction: 1,
        incomeHistory: history("2026-10", 12, 6200),
        sickLeaves: [],
      },
      father: { ...piotr, firstName: "Marek", lastName: "Lis", pesel: "85020311431", birthDate: "1985-02-03" },
      child: { path: "adopcja", dueDate: "2026-12-01", childrenCount: 1, zaZyciem: false, childAgeYears: 3 },
      plan: { ...basePlan, motherParentalWeeks: 32, fatherParentalWeeks: 9 },
      family: { householdSize: 3, monthlyNetIncomeTotal: 11000, aktywnyRodzicOption: "praca", bothParentsWorking: true },
    },
  },
];

export function emptyCase(): Omit<CaseInput, "asOf"> {
  return {
    mother: {
      firstName: "",
      lastName: "",
      pesel: "",
      role: "matka",
      birthDate: "1995-01-01",
      title: "uop",
      voluntarySickness: false,
      insuranceStart: "2024-01-01",
      payer: { name: "", nip: "", insuredCount: 10 },
      workTimeFraction: 1,
      incomeHistory: history("2026-10", 12, 6500),
      sickLeaves: [],
    },
    child: { path: "biologiczny", dueDate: "2027-03-01", childrenCount: 1, zaZyciem: false },
    plan: basePlan,
    family: baseFamily,
  };
}

export { history as buildIncomeHistory };
