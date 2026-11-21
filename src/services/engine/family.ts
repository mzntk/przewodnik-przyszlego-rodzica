/**
 * Świadczenia rodzinne poza ubezpieczeniem chorobowym: 800+, becikowe, Aktywny Rodzic, świadczenie rodzicielskie.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { CaseInput, FamilyBenefitResult } from "@/models/types";
import { addMonths, round2 } from "./dates";

export function familyBenefits(input: CaseInput, cfg: LegalConfig, ctx: { motherInsured: boolean; fatherInsured: boolean }): FamilyBenefitResult[] {
  const a = cfg.amounts;
  const { child, family } = input;
  const event = child.birthDate ?? child.dueDate;
  const n = Math.max(1, child.childrenCount);
  const out: FamilyBenefitResult[] = [];
  if (child.stillbirth) return out;

  out.push({
    id: "800plus",
    name: "Rodzina 800+",
    eligible: true,
    monthly: a.family800 * n,
    months: 216,
    total: a.family800 * n * 216,
    reason: `${a.family800} zł miesięcznie na każde dziecko do 18. roku życia, bez kryterium dochodowego.`,
    where: "ZUS – PUE/eZUS, bankowość elektroniczna, mObywatel",
    deadline: addMonths(event, cfg.deadlines.family800RetroMonths),
  });

  const perPerson = family.householdSize > 0 ? round2(family.monthlyNetIncomeTotal / family.householdSize) : 0;
  const becEligible = child.path === "biologiczny" && perPerson <= a.becikoweIncomeLimit;
  out.push({
    id: "becikowe",
    name: "Becikowe (jednorazowa zapomoga)",
    eligible: becEligible,
    oneOff: becEligible ? a.becikowe * n : 0,
    total: becEligible ? a.becikowe * n : 0,
    reason: becEligible
      ? `Dochód ${perPerson.toLocaleString("pl-PL")} zł/os. ≤ ${a.becikoweIncomeLimit} zł – przysługuje ${a.becikowe} zł na dziecko.`
      : child.path !== "biologiczny"
        ? "Przy przysposobieniu becikowe przysługuje do 12 mies. od przyjęcia, nie później niż do 18. r.ż. – sprawdź w gminie."
        : `Dochód ${perPerson.toLocaleString("pl-PL")} zł/os. przekracza kryterium ${a.becikoweIncomeLimit} zł.`,
    where: "Urząd gminy / MOPS (lub gov.pl)",
    deadline: addMonths(event, cfg.deadlines.becikoweMonths),
  });

  const opt = family.aktywnyRodzicOption;
  const arMonthly = opt === "praca" ? a.aktywnyRodzicWork : opt === "zlobek" ? Math.min(a.aktywnyRodzicNursery, family.nurseryFee ?? a.aktywnyRodzicNursery) : opt === "dom" ? a.aktywnyRodzicHome : 0;
  const arMonths = 24; // 12.–35. miesiąc życia
  out.push({
    id: "aktywny_rodzic",
    name: "Aktywny Rodzic",
    eligible: opt !== null && (opt !== "praca" || family.bothParentsWorking),
    monthly: arMonthly,
    months: arMonths,
    total: opt === "praca" && !family.bothParentsWorking ? 0 : arMonthly * arMonths,
    reason:
      opt === "praca"
        ? family.bothParentsWorking
          ? `„Aktywnie w pracy” – ${a.aktywnyRodzicWork} zł/mies. od 12. do 35. miesiąca życia (oboje rodzice aktywni zawodowo).`
          : "„Aktywnie w pracy” wymaga aktywności zawodowej obojga rodziców (składki od min. płacy)."
        : opt === "zlobek"
          ? `„Aktywnie w żłobku” – dopłata do czesnego, maks. ${a.aktywnyRodzicNursery} zł/mies.`
          : opt === "dom"
            ? `„Aktywnie w domu” – ${a.aktywnyRodzicHome} zł/mies. od 12. do 35. miesiąca życia.`
            : "Wybierz jedną z trzech opcji – można pobierać tylko jedną naraz.",
    where: "ZUS – PUE/eZUS",
    conflict: "Tylko jedna z trzech opcji programu w danym okresie.",
  });

  // Świadczenie rodzicielskie – gdy brak zasiłku macierzyńskiego
  const weeks = cfg.amounts.parentalBenefitWeeks[Math.min(n, 5) - 1];
  const kosEligible = !ctx.motherInsured;
  const months = round2(weeks / 4.345);
  out.push({
    id: "kosiniakowe",
    name: "Świadczenie rodzicielskie („kosiniakowe”)",
    eligible: kosEligible,
    monthly: a.parentalBenefit,
    months: Math.round(months),
    total: kosEligible ? round2(a.parentalBenefit * (weeks * 7) / 30) : 0,
    reason: kosEligible
      ? `Brak prawa do zasiłku macierzyńskiego → ${a.parentalBenefit} zł/mies. przez ${weeks} tygodni (bez kryterium dochodowego).`
      : "Nie przysługuje – prawo do zasiłku macierzyńskiego wyklucza świadczenie rodzicielskie za ten sam okres.",
    where: "Urząd gminy / MOPS",
    conflict: kosEligible ? undefined : "Wyklucza się z zasiłkiem macierzyńskim (art. 17c u.ś.r.).",
  });
  return out;
}
