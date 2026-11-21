/**
 * Podstawa wymiaru zasiłku – art. 36–52 ustawy zasiłkowej.
 * Czysto deterministyczne – zero AI.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { BaseCalculation, ParentProfile, InsuranceTitle } from "@/models/types";
import { addMonths, fullCalendarMonthsBetween, round2, diffDays } from "./dates";

const EMPLOYEE_TITLES: InsuranceTitle[] = ["uop"];
const DECLARED_TITLES: InsuranceTitle[] = ["jdg", "jdg_preferencyjna", "maly_zus_plus"];

export function isEmployee(p: ParentProfile) {
  return EMPLOYEE_TITLES.includes(p.title);
}
export function isDeclaredBaseTitle(t: InsuranceTitle) {
  return DECLARED_TITLES.includes(t);
}

function monthsBefore(p: ParentProfile, eventIso: string, max = 12) {
  const eventMonth = eventIso.slice(0, 7);
  return [...p.incomeHistory]
    .filter((m) => m.month < eventMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-max);
}

function emptyBase(reason: string): BaseCalculation {
  return {
    method: "brak",
    methodLabel: reason,
    steps: [],
    includedMonths: 0,
    excludedMonths: [],
    supplementedMonths: [],
    grossAverage: 0,
    base: 0,
    dailyBase: 0,
    minimumApplied: false,
    capApplied: false,
    legal: [],
  };
}

/** Najniższa podstawa składek dla tytułów z deklarowaną kwotą (art. 48a ust. 1 pkt 1 i ust. 5). */
export function lowestDeclaredBase(title: InsuranceTitle, cfg: LegalConfig) {
  if (title === "jdg") return cfg.jdgMinBase;
  return cfg.jdgPreferentialBase; // preferencyjna i Mały ZUS+ (min. 30% płacy minimalnej)
}

export function computeBase(p: ParentProfile, eventIso: string, cfg: LegalConfig): BaseCalculation {
  const deduct = 1 - cfg.socialContributionRate;

  // Zasada ciągłości – przerwa krótsza niż 1 miesiąc: brak przeliczenia (art. 43)
  if (p.previousBenefitBase && p.previousBenefitEnd) {
    const oneMonthAfter = addMonths(p.previousBenefitEnd, 1);
    if (eventIso < oneMonthAfter && diffDays(p.previousBenefitEnd, eventIso) >= 0) {
      return {
        method: "ciaglosc",
        methodLabel: "Zasada ciągłości – podstawa z poprzedniego zasiłku",
        steps: [
          { label: "Koniec poprzedniego zasiłku", value: p.previousBenefitEnd },
          { label: "Przerwa krótsza niż 1 miesiąc kalendarzowy", value: "tak", note: "art. 43 ustawy zasiłkowej" },
          { label: "Podstawa przyjęta bez przeliczenia", value: p.previousBenefitBase },
        ],
        includedMonths: 0,
        excludedMonths: [],
        supplementedMonths: [],
        grossAverage: round2(p.previousBenefitBase / deduct),
        base: round2(p.previousBenefitBase),
        dailyBase: round2(p.previousBenefitBase / 30),
        minimumApplied: false,
        capApplied: false,
        legal: [{ act: "ustawa zasiłkowa", article: "art. 43" }],
      };
    }
  }

  if (isEmployee(p)) return computeEmployeeBase(p, eventIso, cfg);
  if (["zlecenie", "jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(p.title)) return computeNonEmployeeBase(p, eventIso, cfg);
  return emptyBase("Brak podstawy – brak tytułu do ubezpieczenia chorobowego");
}

function computeEmployeeBase(p: ParentProfile, eventIso: string, cfg: LegalConfig): BaseCalculation {
  const deduct = 1 - cfg.socialContributionRate;
  const months = monthsBefore(p, eventIso);
  const steps: BaseCalculation["steps"] = [];
  const excluded: string[] = [];
  const supplemented: string[] = [];
  const legal: BaseCalculation["legal"] = [{ act: "ustawa zasiłkowa", article: "art. 36" }];
  let sum = 0;
  let count = 0;

  for (const m of months) {
    const ratio = m.requiredDays && m.requiredDays > 0 ? (m.workedDays ?? m.requiredDays) / m.requiredDays : 1;
    if (ratio < 0.5) {
      excluded.push(m.month);
      steps.push({ label: `${m.month}: przepracowano < 1/2 czasu pracy`, value: "wyłączony", note: "art. 38 ust. 2 pkt 1" });
      continue;
    }
    let amount = m.gross;
    if (ratio < 1) {
      const fixed = m.fixedContract ?? 0;
      const variable = Math.max(0, m.gross - fixed * ratio);
      amount = fixed > 0 ? fixed + variable / ratio : m.gross / ratio;
      supplemented.push(m.month);
      steps.push({ label: `${m.month}: uzupełnienie do pełnego miesiąca`, value: round2(amount), note: `faktycznie ${round2(m.gross)} zł · art. 38 ust. 2 pkt 2` });
    } else {
      steps.push({ label: `${m.month}: wynagrodzenie brutto`, value: round2(amount) });
    }
    sum += amount;
    count++;
  }

  let method: BaseCalculation["method"] = count >= 12 ? "pracownik_12m" : "pracownik_krotszy";
  let grossAverage = count > 0 ? sum / count : 0;

  if (count === 0) {
    // art. 37 / art. 38 ust. 2 – wynagrodzenie z umowy, gdy brak miesięcy do uwzględnienia
    const contract = months.at(-1)?.fixedContract ?? p.declaredBase ?? cfg.minWage * p.workTimeFraction;
    grossAverage = contract;
    method = "pracownik_umowa";
    steps.push({ label: "Brak pełnych miesięcy do uwzględnienia – wynagrodzenie z umowy", value: round2(contract), note: "art. 37 ust. 2 pkt 1" });
    legal.push({ act: "ustawa zasiłkowa", article: "art. 37" });
  } else {
    steps.push({ label: `Średnia z ${count} mies.`, value: round2(grossAverage) });
    legal.push({ act: "ustawa zasiłkowa", article: "art. 38" });
  }

  const quarterly = (p.quarterlyBonuses ?? 0) / 12;
  const annual = (p.annualBonus ?? 0) / 12;
  if (quarterly > 0) {
    steps.push({ label: "+ 1/12 premii kwartalnych (4 kwartały)", value: round2(quarterly), note: "art. 42 ust. 1" });
    legal.push({ act: "ustawa zasiłkowa", article: "art. 42" });
  }
  if (annual > 0) {
    steps.push({ label: "+ 1/12 premii rocznej", value: round2(annual), note: "art. 42 ust. 2" });
  }
  const grossWithBonuses = grossAverage + quarterly + annual;
  let base = round2(grossWithBonuses * deduct);
  steps.push({ label: `− ${(cfg.socialContributionRate * 100).toFixed(2)}% składek społecznych`, value: base, note: "art. 3 pkt 3" });

  let minimumApplied = false;
  if (p.workTimeFraction >= 1) {
    const minimum = round2(cfg.minWage * deduct);
    if (base < minimum) {
      base = minimum;
      minimumApplied = true;
      steps.push({ label: "Gwarancja minimum (płaca minimalna − 13,71%)", value: minimum, note: "art. 45 ust. 1" });
      legal.push({ act: "ustawa zasiłkowa", article: "art. 45" });
    }
  }

  return {
    method,
    methodLabel:
      method === "pracownik_12m"
        ? "Pracownik – średnia z 12 miesięcy"
        : method === "pracownik_krotszy"
          ? `Pracownik – średnia z ${count} pełnych miesięcy ubezpieczenia`
          : "Pracownik – wynagrodzenie z umowy (uzupełnienie)",
    steps,
    includedMonths: count,
    excludedMonths: excluded,
    supplementedMonths: supplemented,
    grossAverage: round2(grossWithBonuses),
    base,
    dailyBase: round2(base / 30),
    minimumApplied,
    capApplied: false,
    legal,
  };
}

function computeNonEmployeeBase(p: ParentProfile, eventIso: string, cfg: LegalConfig): BaseCalculation {
  const deduct = 1 - cfg.socialContributionRate;
  const cap = cfg.maxVoluntarySicknessBase;
  const steps: BaseCalculation["steps"] = [];
  const legal: BaseCalculation["legal"] = [{ act: "ustawa zasiłkowa", article: "art. 48" }];

  let fullMonths = fullCalendarMonthsBetween(p.insuranceStart, eventIso);
  // art. 48a ust. 2 – doliczenie miesięcy z poprzedniego tytułu po przerwie ≤ 30 dni
  if (p.previousInsuranceEnd && p.previousInsuranceMonths && diffDays(p.previousInsuranceEnd, p.insuranceStart) <= cfg.waiting.breakToleranceDays + 1) {
    fullMonths = Math.min(12, fullMonths + p.previousInsuranceMonths);
    steps.push({ label: "Doliczone pełne miesiące z poprzedniego tytułu (przerwa ≤ 30 dni)", value: p.previousInsuranceMonths, note: "art. 48a ust. 2" });
  }
  const months = monthsBefore(p, eventIso);
  let capApplied = false;
  const capped = months.map((m) => {
    if (m.gross > cap) capApplied = true;
    return { ...m, gross: Math.min(m.gross, cap) };
  });
  if (capApplied) {
    steps.push({ label: `Ograniczenie miesięcznej podstawy do ${cap.toLocaleString("pl-PL")} zł`, value: cap, note: "art. 20 ust. 3 u.s.u.s. / art. 46" });
    legal.push({ act: "ustawa zasiłkowa", article: "art. 46" });
  }

  const declared = isDeclaredBaseTitle(p.title);

  // art. 49 – niezdolność przed upływem pełnego miesiąca
  if (fullMonths === 0 || capped.length === 0) {
    const amount = declared ? lowestDeclaredBase(p.title, cfg) : (capped.at(-1)?.gross ?? p.declaredBase ?? 0);
    const base = round2(amount * deduct);
    steps.push({
      label: declared ? "Najniższa podstawa składek za miesiąc powstania prawa" : "Przychód z umowy za miesiąc powstania prawa",
      value: round2(amount),
      note: declared ? "art. 49 ust. 1 pkt 1" : "art. 49 ust. 1 pkt 2",
    });
    steps.push({ label: `− ${(cfg.socialContributionRate * 100).toFixed(2)}%`, value: base });
    return {
      method: "niepracownik_49",
      methodLabel: "Niepracownik – mniej niż 1 pełny miesiąc ubezpieczenia",
      steps,
      includedMonths: 0,
      excludedMonths: [],
      supplementedMonths: [],
      grossAverage: round2(amount),
      base,
      dailyBase: round2(base / 30),
      minimumApplied: false,
      capApplied,
      legal: [...legal, { act: "ustawa zasiłkowa", article: "art. 49" }],
    };
  }

  // art. 48a – deklarowana podstawa, staż < 12 miesięcy
  if (declared && fullMonths < 12) {
    const n = Math.min(fullMonths, 12);
    const relevant = capped.slice(-Math.min(n, capped.length));
    const lowest = lowestDeclaredBase(p.title, cfg);
    const avgDeclared = relevant.reduce((s, m) => s + m.gross, 0) / relevant.length;
    const excess = Math.max(0, avgDeclared - lowest);
    const part1 = lowest * deduct;
    const part2 = ((excess * deduct) / 12) * n;
    const base = round2(part1 + part2);
    steps.push({ label: "Najniższa podstawa składek (po odliczeniu 13,71%)", value: round2(part1), note: `${lowest.toLocaleString("pl-PL")} zł × ${deduct.toFixed(4)} · art. 48a ust. 1 pkt 1` });
    steps.push({ label: "Przeciętna zadeklarowana podstawa", value: round2(avgDeclared) });
    steps.push({ label: "Nadwyżka ponad najniższą podstawę (po odliczeniu)", value: round2(excess * deduct) });
    steps.push({ label: `1/12 nadwyżki × ${n} pełnych mies.`, value: round2(part2), note: "art. 48a ust. 1 pkt 2" });
    steps.push({ label: "Podstawa wymiaru zasiłku", value: base });
    return {
      method: "niepracownik_48a",
      methodLabel: `Niepracownik z deklarowaną podstawą – staż ${n} mies. (art. 48a)`,
      steps,
      includedMonths: n,
      excludedMonths: [],
      supplementedMonths: [],
      grossAverage: round2(avgDeclared),
      base,
      dailyBase: round2(base / 30),
      minimumApplied: false,
      capApplied,
      legal: [...legal, { act: "ustawa zasiłkowa", article: "art. 48a" }],
    };
  }

  const relevant = capped.slice(-Math.min(12, fullMonths, capped.length));
  const avg = relevant.reduce((s, m) => s + m.gross, 0) / relevant.length;
  const base = round2(avg * deduct);
  steps.push({ label: `Przeciętny miesięczny przychód z ${relevant.length} mies.`, value: round2(avg), note: "art. 48 ust. 1" });
  steps.push({ label: `− ${(cfg.socialContributionRate * 100).toFixed(2)}% (art. 3 pkt 4)`, value: base });
  return {
    method: "niepracownik_12m",
    methodLabel: relevant.length >= 12 ? "Niepracownik – przeciętny przychód z 12 miesięcy" : `Niepracownik – przeciętny przychód z ${relevant.length} pełnych miesięcy`,
    steps,
    includedMonths: relevant.length,
    excludedMonths: [],
    supplementedMonths: [],
    grossAverage: round2(avg),
    base,
    dailyBase: round2(base / 30),
    minimumApplied: false,
    capApplied,
    legal,
  };
}
