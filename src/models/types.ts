/**
 * Ustandaryzowane typy domenowe – wspólny „język” silnika uprawnień,
 * walidatora dokumentów, API REST i interfejsu.
 */

export type InsuranceTitle =
  | "uop" // umowa o pracę
  | "zlecenie" // umowa zlecenia / agencyjna
  | "jdg" // pozarolnicza działalność – pełny ZUS
  | "jdg_preferencyjna" // preferencyjna podstawa (30% płacy min.)
  | "maly_zus_plus"
  | "ulga_na_start"
  | "nierejestrowa"
  | "student_zlecenie" // student/uczeń < 26 r.ż. na zleceniu
  | "brak";

export const TITLE_LABELS: Record<InsuranceTitle, string> = {
  uop: "Umowa o pracę",
  zlecenie: "Umowa zlecenia",
  jdg: "Działalność gospodarcza (pełny ZUS)",
  jdg_preferencyjna: "JDG – preferencyjne składki",
  maly_zus_plus: "JDG – Mały ZUS+",
  ulga_na_start: "JDG – ulga na start",
  nierejestrowa: "Działalność nierejestrowa",
  student_zlecenie: "Student/uczeń < 26 lat na zleceniu",
  brak: "Brak tytułu ubezpieczenia",
};

export type ParentRole = "matka" | "ojciec";
export type FamilyPath = "biologiczny" | "adopcja" | "rodzina_zastepcza";

export interface MonthIncome {
  /** RRRR-MM */
  month: string;
  /** Przychód brutto (pracownik) lub zadeklarowana podstawa (niepracownik) */
  gross: number;
  /** Stały składnik z umowy (do uzupełniania niepełnego miesiąca) */
  fixedContract?: number;
  /** Dni przepracowane / dni obowiązujące – do reguły „1/2 czasu pracy” */
  workedDays?: number;
  requiredDays?: number;
}

export interface SickLeave {
  id: string;
  from: string; // ISO
  to: string; // ISO
  codeB: boolean;
  issuer?: string;
  diagnosis?: string;
}

export interface PayerInfo {
  name: string;
  nip: string;
  insuredCount: number; // liczba zgłoszonych do ubezpieczenia chorobowego na 30.11 poprzedniego roku
}

export interface ParentProfile {
  firstName: string;
  lastName: string;
  pesel: string;
  role: ParentRole;
  birthDate: string;
  title: InsuranceTitle;
  /** Dobrowolne ubezpieczenie chorobowe (zlecenie / JDG) */
  voluntarySickness: boolean;
  insuranceStart: string; // nieprzerwane ubezpieczenie chorobowe od
  previousInsuranceEnd?: string; // koniec poprzedniego tytułu (do sumowania przerw ≤ 30 dni)
  previousInsuranceMonths?: number;
  payer?: PayerInfo;
  workTimeFraction: number; // etat: 1 = pełny
  contractEndDate?: string; // umowa na czas określony
  incomeHistory: MonthIncome[];
  quarterlyBonuses?: number; // suma premii kwartalnych za 4 poprzednie kwartały
  annualBonus?: number; // premia roczna za poprzedni rok
  /** JDG */
  declaredBase?: number;
  contributionDebt?: number;
  debtCheckDate?: string;
  /** Wyjątki od okresu wyczekiwania (art. 4 ust. 3) */
  waitingExceptions?: {
    graduate?: boolean;
    tenYearsMandatory?: boolean;
    commutingAccident?: boolean;
  };
  previousBenefitBase?: number; // podstawa z poprzedniego zasiłku
  previousBenefitEnd?: string; // do zasady ciągłości (przerwa < 1 mies.)
  secondaryTitles?: InsuranceTitle[];
  sickLeaves: SickLeave[];
  age50plus?: boolean;
  employmentLossReason?: "upadlosc" | "likwidacja" | "smierc_pracodawcy" | "bezprawne_zwolnienie" | null;
}

/** Dane jednego dziecka – płeć i imię przed porodem, a po urodzeniu dane do dokumentów (USC, ZCNA, 800+, ZAM). */
export interface KidInfo {
  /** „nie_wiem” – rodzice jeszcze nie znają płci (albo nie chcą jej podawać) */
  sex?: "dziewczynka" | "chlopiec" | "nie_wiem";
  /** Jak aplikacja ma zwracać się do dziecka (wybrane imię, zmienialne w ustawieniach) */
  name?: string;
  /** Po urodzeniu: pełne imię (imiona) i nazwisko z aktu urodzenia */
  fullName?: string;
  lastName?: string;
  birthTime?: string;
  birthPlace?: string;
  weightG?: number;
  pesel?: string;
}

export interface ChildEvent {
  path: FamilyPath;
  /** Po jednym wpisie na każde dziecko (bliźnięta – dwa wpisy) */
  kids?: KidInfo[];
  dueDate: string; // przewidywana data porodu / przyjęcia
  birthDate?: string; // faktyczna
  childrenCount: number;
  delivery?: "naturalny" | "cesarskie";
  zaZyciem: boolean;
  /** Wcześniactwo / hospitalizacja – uzupełniający urlop macierzyński */
  gestationWeek?: number;
  birthWeightsG?: number[];
  hospitalizationDays?: number[];
  hospitalizationStartDay?: number; // dzień życia, w którym zaczęła się hospitalizacja
  /** Adopcja / piecza */
  childAgeYears?: number;
  schoolDeferred?: boolean;
  /** Sytuacje szczególne */
  stillbirth?: boolean;
  childDeathDate?: string;
  motherHospitalized?: boolean;
  motherDeceased?: boolean;
}

export interface LeavePlan {
  variant: "standard" | "combined"; // 100%+70% vs 81,5%
  /** Tygodnie rodzicielskiego wykorzystywane przez matkę (pozostałe – ojciec) */
  motherParentalWeeks: number;
  fatherParentalWeeks: number;
  fatherTakesMaternityAfterWeeks?: number; // przejęcie części macierzyńskiego przez ojca
  simultaneous: boolean;
  /** Łączenie rodzicielskiego z pracą */
  combineWithWork: {
    enabled: boolean;
    who: ParentRole;
    fraction: number; // 0–0,5 etatu
    weeks: number; // ile tygodni rodzicielskiego łączy z pracą
  };
  paternity: { enabled: boolean; split: "jednorazowo" | "2x7" };
  parentalParts: number;
  maternityStartBeforeBirthWeeks: number;
  usedParentalInFirstYear: boolean;
}

export interface CareRequest {
  enabled: boolean;
  type: "dziecko_do_14" | "dziecko_14_18" | "inny_czlonek";
  days: number;
  usedThisYear: number;
}

export interface FamilyBenefitsInput {
  householdSize: number;
  monthlyNetIncomeTotal: number;
  aktywnyRodzicOption: "praca" | "zlobek" | "dom" | null;
  nurseryFee?: number;
  bothParentsWorking: boolean;
}

export interface CaseInput {
  mother: ParentProfile;
  father?: ParentProfile;
  child: ChildEvent;
  plan: LeavePlan;
  care?: CareRequest;
  family: FamilyBenefitsInput;
  /** Data, na którą liczymy („dziś” w symulacji) */
  asOf: string;
}

/* ---------------------------- Wyniki silnika ---------------------------- */

export type Severity = "info" | "success" | "warning" | "danger" | "gold";

export interface LegalRef {
  act: "ustawa zasiłkowa" | "Kodeks pracy" | "rozporządzenie 27.09.2026" | "rozporządzenie 11.03.2025" | "u.s.u.s." | "u.ś.r." | "ustawa 800+" | "ustawa o wspieraniu rodziców" | "ustawa emerytalna" | "ustawa o rejestracji stanu cywilnego";
  article: string;
}

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  legal?: LegalRef[];
  action?: { label: string; href: string };
}

export interface BaseCalculation {
  method: "pracownik_12m" | "pracownik_krotszy" | "pracownik_umowa" | "niepracownik_12m" | "niepracownik_48a" | "niepracownik_49" | "ciaglosc" | "brak";
  methodLabel: string;
  steps: { label: string; value: number | string; note?: string }[];
  includedMonths: number;
  excludedMonths: string[];
  supplementedMonths: string[];
  grossAverage: number;
  base: number; // miesięczna podstawa wymiaru zasiłku
  dailyBase: number; // 1/30
  minimumApplied: boolean;
  capApplied: boolean;
  legal: LegalRef[];
}

export interface EligibilityResult {
  insured: boolean;
  insuredLabel: string;
  reason: string;
  legal: LegalRef[];
  waitingPeriod: {
    required: number;
    served: number;
    satisfied: boolean;
    exception?: string;
    eligibleFrom: string | null;
  };
  debtBlock: {
    applies: boolean;
    blocked: boolean;
    debt: number;
    threshold: number;
    expiresOn?: string;
  };
  payer: PayerRouting;
}

export interface PayerRouting {
  payer: "pracodawca" | "zus";
  payerLabel: string;
  reason: string;
  legal: LegalRef[];
  submitTo: string;
  documents: DocumentRequirement[];
  birthCertificateRequired: boolean;
}

export interface DocumentRequirement {
  code: "ZAM" | "Z-3" | "Z-3a" | "ZAS-12" | "ZAS-53" | "Z-15A" | "Z-15B" | "Z-12" | "e-ZLA" | "WNIOSEK-URLOP" | "ODPIS-AKTU" | "ZASW-ZA-ZYCIEM" | "ZASW-SZPITAL" | "ZASW-PORÓD" | "ZASW-MARTWE" | "POSTANOWIENIE-SADU" | "ZUS-ZCNA" | "ZUS-ZUA";
  name: string;
  who: "ubezpieczony" | "płatnik" | "lekarz" | "USC" | "sąd" | "szpital";
  to: "pracodawca" | "ZUS" | "USC";
  when: string;
  note?: string;
}

export interface BenefitSegment {
  id: string;
  kind: "wynagrodzenie_chorobowe" | "chorobowy" | "rehabilitacyjne" | "w_wysokosci_macierzynskiego" | "macierzynski" | "uzupelniajacy" | "rodzicielski" | "rodzicielski_niezbywalny" | "rodzicielski_praca" | "ojcowski" | "opiekunczy" | "kosiniakowe";
  label: string;
  who: ParentRole;
  payer: "pracodawca" | "zus" | "budżet (MOPS)";
  from: string;
  to: string;
  days: number;
  weeks: number;
  rate: number; // ułamek podstawy
  workReduction?: number; // obniżenie przy łączeniu z pracą
  dailyAmount: number;
  monthlyAmount: number; // 30 dni
  total: number;
  raisedToParentalBenefit?: boolean;
  legal: LegalRef[];
}

export interface VariantComparison {
  standard: { total: number; monthlyFirst: number; monthlyLater: number; label: string };
  combined: { total: number; monthly: number; label: string; equalization: number };
  difference: number;
  recommendation: "standard" | "combined" | "equal";
  note: string;
}

export interface Deadline {
  id: string;
  date: string;
  title: string;
  description: string;
  who: ParentRole | "oboje";
  severity: Severity;
  kind: "przed_porodem" | "po_porodzie" | "urlop" | "swiadczenia" | "przedawnienie";
  legal?: LegalRef[];
  daysLeft: number;
  /** Przedział okna (np. start macierzyńskiego) */
  windowStart?: string;
}

export interface SicknessAnalysis {
  totalDays: number;
  employerDays: number;
  zusDays: number;
  periodUsed: number;
  periodRemaining: number;
  resetByCodeB: boolean;
  waitingDaysUnpaid: number;
  segments: BenefitSegment[];
  rehabilitation: { possible: boolean; maxMonths: number; rate: number; monthly: number };
  maternityLevelBenefit: { applies: boolean; reason?: string; monthly: number };
}

export interface FamilyBenefitResult {
  id: "800plus" | "becikowe" | "aktywny_rodzic" | "kosiniakowe";
  name: string;
  eligible: boolean;
  monthly?: number;
  oneOff?: number;
  months?: number;
  total: number;
  reason: string;
  where: string;
  deadline?: string;
  conflict?: string;
}

export interface CalculationResult {
  configVersion: string;
  computedAt: string;
  mother: {
    eligibility: EligibilityResult;
    base: BaseCalculation;
    sicknessBase: BaseCalculation;
    sickness: SicknessAnalysis;
  };
  father?: {
    eligibility: EligibilityResult;
    base: BaseCalculation;
  };
  leave: {
    maternityWeeks: number;
    maternityMinMotherWeeks: number;
    supplementaryWeeks: number;
    supplementaryReason: string;
    parentalWeeks: number;
    parentalExtendedWeeks: number;
    parentalExtensionDays: number;
    nonTransferableWeeks: number;
    paternityWeeks: number;
    adoptionNote?: string;
    totalFamilyWeeks: number;
  };
  segments: BenefitSegment[];
  totals: { mother: number; father: number; family: number; monthlyMotherFirst: number };
  variants: VariantComparison;
  care?: { days: number; allowed: number; daily: number; total: number; form: "Z-15A" | "Z-15B"; note: string };
  familyBenefits: FamilyBenefitResult[];
  deadlines: Deadline[];
  findings: Finding[];
  timelineStart: string;
  timelineEnd: string;
}
