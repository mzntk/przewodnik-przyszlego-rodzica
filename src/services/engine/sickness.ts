/**
 * Zasiłek chorobowy w ciąży, wynagrodzenie chorobowe, świadczenie rehabilitacyjne
 * i zasiłek w wysokości zasiłku macierzyńskiego (art. 4, 8–9, 11, 18–19, 29–30 ustawy; art. 92 KP).
 */
import type { LegalConfig } from "@/models/legal-config";
import type { BaseCalculation, BenefitSegment, EligibilityResult, ParentProfile, SicknessAnalysis } from "@/models/types";
import { addDays, diffDays, inclusiveDays, round2 } from "./dates";

export function analyzeSickness(p: ParentProfile, base: BaseCalculation, elig: EligibilityResult, cfg: LegalConfig): SicknessAnalysis {
  const leaves = [...p.sickLeaves].sort((a, b) => a.from.localeCompare(b.from));
  const employee = p.title === "uop";
  const employerLimit = p.age50plus ? cfg.leave.employerSickDays50 : cfg.leave.employerSickDays;
  const daily = base.dailyBase;
  const segments: BenefitSegment[] = [];
  const employerUsedByYear: Record<string, number> = {};

  let periodUsed = 0;
  let prevTo: string | null = null;
  let prevCodeB = false;
  let resetByCodeB = false;
  let waitingDaysUnpaid = 0;
  let employerDays = 0;
  let zusDays = 0;
  let totalDays = 0;
  const payer = elig.payer.payer;

  for (const l of leaves) {
    const days = inclusiveDays(l.from, l.to);
    totalDays += days;
    // Okres zasiłkowy (art. 9 ust. 2): przerwa > 60 dni → nowy okres; po przerwie w ciąży → nie wlicza się okresów sprzed przerwy
    if (prevTo) {
      const gap = diffDays(prevTo, l.from) - 1;
      if (gap > cfg.leave.sicknessBreakMergeDays) periodUsed = 0;
      else if (gap > 0 && l.codeB) {
        if (periodUsed > 0) resetByCodeB = true;
        periodUsed = 0;
      }
    }
    prevTo = l.to;
    prevCodeB = l.codeB;

    // Okres wyczekiwania (art. 4) – dni przed nabyciem prawa są niepłatne i nie wliczają się do okresu (art. 9 ust. 3)
    let start = l.from;
    if (!elig.insured) {
      waitingDaysUnpaid += days;
      continue;
    }
    if (!elig.waitingPeriod.satisfied && elig.waitingPeriod.eligibleFrom && l.from < elig.waitingPeriod.eligibleFrom) {
      const unpaidTo = l.to < elig.waitingPeriod.eligibleFrom ? l.to : addDays(elig.waitingPeriod.eligibleFrom, -1);
      waitingDaysUnpaid += inclusiveDays(l.from, unpaidTo);
      if (l.to < elig.waitingPeriod.eligibleFrom) continue;
      start = elig.waitingPeriod.eligibleFrom;
    }
    let remaining = inclusiveDays(start, l.to);
    const rate = l.codeB ? cfg.rates.sicknessPregnancy : cfg.rates.sicknessStandard;

    // Wynagrodzenie chorobowe – pracodawca, 33/14 dni w roku kalendarzowym (art. 92 KP)
    if (employee) {
      const year = start.slice(0, 4);
      const used = employerUsedByYear[year] ?? 0;
      const empDays = Math.min(remaining, Math.max(0, employerLimit - used));
      if (empDays > 0) {
        const to = addDays(start, empDays - 1);
        const empRate = l.codeB ? cfg.rates.employerSickPay : 0.8;
        segments.push(seg(`wyn-${l.id}`, "wynagrodzenie_chorobowe", "Wynagrodzenie chorobowe", "pracodawca", start, to, empDays, empRate, daily, [{ act: "Kodeks pracy", article: "art. 92 § 1" }]));
        employerUsedByYear[year] = used + empDays;
        employerDays += empDays;
        periodUsed += empDays;
        remaining -= empDays;
        start = addDays(to, 1);
      }
    }
    if (remaining <= 0) continue;
    const allowed = Math.max(0, cfg.leave.sicknessPeriodDays - periodUsed);
    const paid = Math.min(remaining, allowed);
    if (paid > 0) {
      const to = addDays(start, paid - 1);
      segments.push(
        seg(`chor-${l.id}`, "chorobowy", l.codeB ? "Zasiłek chorobowy w ciąży (kod B)" : "Zasiłek chorobowy", payer === "pracodawca" ? "pracodawca" : "zus", start, to, paid, rate, daily, [
          { act: "ustawa zasiłkowa", article: l.codeB ? "art. 11 ust. 2 pkt 2" : "art. 11 ust. 1" },
        ]),
      );
      zusDays += paid;
      periodUsed += paid;
    }
  }
  void prevCodeB;

  const periodRemaining = Math.max(0, cfg.leave.sicknessPeriodDays - periodUsed);
  const loss = p.employmentLossReason;
  const mlApplies = loss === "upadlosc" || loss === "likwidacja" || loss === "smierc_pracodawcy" || loss === "bezprawne_zwolnienie";

  return {
    totalDays,
    employerDays,
    zusDays,
    periodUsed,
    periodRemaining,
    resetByCodeB,
    waitingDaysUnpaid,
    segments,
    rehabilitation: {
      possible: periodRemaining === 0 && elig.insured,
      maxMonths: cfg.leave.rehabMaxMonths,
      rate: cfg.rates.rehabPregnancy,
      monthly: round2(base.base * cfg.rates.rehabPregnancy),
    },
    maternityLevelBenefit: {
      applies: mlApplies,
      reason: mlApplies
        ? loss === "bezprawne_zwolnienie"
          ? "Rozwiązanie umowy z naruszeniem przepisów potwierdzone prawomocnym wyrokiem – zasiłek w wysokości macierzyńskiego do dnia porodu (art. 30 ust. 3)."
          : "Utrata zatrudnienia w ciąży z powodu upadłości/likwidacji/śmierci pracodawcy – zasiłek w wysokości macierzyńskiego do dnia porodu (art. 30 ust. 3)."
        : undefined,
      monthly: round2(base.base * cfg.rates.maternity),
    },
  };
}

export function seg(
  id: string,
  kind: BenefitSegment["kind"],
  label: string,
  payer: BenefitSegment["payer"],
  from: string,
  to: string,
  days: number,
  rate: number,
  dailyBase: number,
  legal: BenefitSegment["legal"],
  who: BenefitSegment["who"] = "matka",
  workReduction = 0,
): BenefitSegment {
  const dailyAmount = round2(dailyBase * rate * (1 - workReduction));
  return {
    id,
    kind,
    label,
    who,
    payer,
    from,
    to,
    days,
    weeks: round2(days / 7),
    rate,
    workReduction: workReduction || undefined,
    dailyAmount,
    monthlyAmount: round2(dailyAmount * 30),
    total: round2(dailyAmount * days),
    legal,
  };
}
