/**
 * Zasiłek macierzyński: urlop macierzyński, na warunkach macierzyńskiego, uzupełniający,
 * rodzicielski (w tym łączenie z pracą i podział między rodziców), ojcowski.
 * Podstawy: art. 29–31 ustawy zasiłkowej; art. 180–183 KP.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { BaseCalculation, BenefitSegment, CaseInput, ChildEvent, EligibilityResult, VariantComparison } from "@/models/types";
import { addDays, diffDays, round2, ageOn } from "./dates";
import { seg } from "./sickness";

export function maternityWeeksFor(child: ChildEvent, cfg: LegalConfig): { weeks: number; adoptionNote?: string; minAdoption: boolean } {
  const idx = Math.min(Math.max(child.childrenCount, 1), 5) - 1;
  const standard = cfg.leave.maternityWeeks[idx];
  if (child.path === "biologiczny") {
    if (child.stillbirth) return { weeks: cfg.leave.maternitySpecialWeeks, minAdoption: false };
    return { weeks: standard, minAdoption: false };
  }
  // Adopcja / rodzina zastępcza niezawodowa – limit wieku dziecka (art. 183 KP)
  const ageLimit = child.path === "rodzina_zastepcza" ? (child.schoolDeferred ? cfg.leave.adoptionMaxChildAgeFosterDeferred : cfg.leave.adoptionMaxChildAgeFoster) : cfg.leave.adoptionMaxChildAge;
  const age = child.childAgeYears ?? 0;
  if (age >= ageLimit) {
    return { weeks: 0, minAdoption: false, adoptionNote: `Dziecko ma ${age} lat – przekroczony limit wieku (${ageLimit} lat). Urlop na warunkach macierzyńskiego nie przysługuje.` };
  }
  // tygodnie do osiągnięcia limitu wieku (przybliżenie: wiek w latach ułamkowych)
  const weeksUntilLimit = Math.floor((ageLimit - age) * 52.1775);
  if (weeksUntilLimit >= standard) return { weeks: standard, minAdoption: false };
  if (weeksUntilLimit <= cfg.leave.adoptionMinWeeks) {
    return {
      weeks: cfg.leave.adoptionMinWeeks,
      minAdoption: true,
      adoptionNote: `Ze względu na wiek dziecka przysługuje minimalny wymiar ${cfg.leave.adoptionMinWeeks} tygodni urlopu na warunkach macierzyńskiego (art. 183 § 3 KP), a rodzicielski wynosi ${child.zaZyciem ? cfg.leave.parentalAfterMinAdoption.multiple : cfg.leave.parentalAfterMinAdoption.single} tyg.`,
    };
  }
  return { weeks: weeksUntilLimit, minAdoption: false, adoptionNote: `Urlop skrócony do ukończenia przez dziecko ${ageLimit} lat (${weeksUntilLimit} tyg.).` };
}

export function parentalWeeksFor(child: ChildEvent, cfg: LegalConfig, minAdoption: boolean): { weeks: number; maxExtended: number } {
  const multi = child.childrenCount > 1;
  if (child.stillbirth) return { weeks: 0, maxExtended: 0 };
  if (minAdoption) {
    const w = child.zaZyciem ? cfg.leave.parentalAfterMinAdoption.multiple : cfg.leave.parentalAfterMinAdoption.single;
    return { weeks: w, maxExtended: w * 2 };
  }
  const p = cfg.leave.parentalWeeks;
  const e = cfg.leave.parentalMaxExtended;
  if (child.zaZyciem) return multi ? { weeks: p.zaZyciemMultiple, maxExtended: e.zaZyciemMultiple } : { weeks: p.zaZyciemSingle, maxExtended: e.zaZyciemSingle };
  return multi ? { weeks: p.multiple, maxExtended: e.multiple } : { weeks: p.single, maxExtended: e.single };
}

/** Uzupełniający urlop macierzyński – art. 180² KP. Ciąża mnoga: najniższa masa, najdłuższa hospitalizacja. */
export function supplementaryWeeks(child: ChildEvent, cfg: LegalConfig): { weeks: number; reason: string } {
  const hosp = Math.max(0, ...(child.hospitalizationDays ?? [0]));
  if (!hosp || child.stillbirth) return { weeks: 0, reason: "Brak hospitalizacji noworodka – uzupełniający urlop nie przysługuje." };
  const weight = Math.min(...(child.birthWeightsG?.length ? child.birthWeightsG : [9999]));
  const week = child.gestationWeek ?? 40;
  const severe = week < 28 || weight <= cfg.leave.supplementaryWeightThresholdG;
  const raw = Math.ceil(hosp / 7);
  if (severe) {
    const w = Math.min(raw, cfg.leave.supplementaryMaxSevere);
    return { weeks: w, reason: `Poród ${week < 28 ? "przed ukończeniem 28. tyg. ciąży" : ""}${week < 28 && weight <= 1000 ? " i " : ""}${weight <= cfg.leave.supplementaryWeightThresholdG ? `masa ${weight} g ≤ 1000 g` : ""} – 1 tydzień za każdy rozpoczęty tydzień hospitalizacji (${hosp} dni → ${raw} tyg.), maks. ${cfg.leave.supplementaryMaxSevere} tyg.` };
  }
  if (week < 37) {
    const w = Math.min(raw, cfg.leave.supplementaryMaxModerate);
    return { weeks: w, reason: `Poród między 28. a 37. tyg. ciąży, masa > 1000 g – ${hosp} dni hospitalizacji → ${raw} tyg., maks. ${cfg.leave.supplementaryMaxModerate} tyg.` };
  }
  const startDay = child.hospitalizationStartDay ?? 1;
  if (hosp >= 2 && startDay >= 5 && startDay <= 28) {
    const w = Math.min(raw, cfg.leave.supplementaryMaxModerate);
    return { weeks: w, reason: `Poród po 37. tyg. – hospitalizacja ≥ 2 kolejne dni rozpoczęta w ${startDay}. dniu życia (między 5. a 28. dniem) → ${w} tyg.` };
  }
  return { weeks: 0, reason: `Poród po 37. tyg. – hospitalizacja nie spełnia warunku (min. 2 dni, rozpoczęta między 5. a 28. dniem życia).` };
}

interface BuildCtx {
  input: CaseInput;
  cfg: LegalConfig;
  motherBase: BaseCalculation;
  fatherBase?: BaseCalculation;
  motherElig: EligibilityResult;
  fatherElig?: EligibilityResult;
}

export function buildLeaveSegments(ctx: BuildCtx) {
  const { input, cfg, motherBase, fatherBase, motherElig, fatherElig } = ctx;
  const { child, plan } = input;
  const event = child.birthDate ?? child.dueDate;
  const mat = maternityWeeksFor(child, cfg);
  const par = parentalWeeksFor(child, cfg, mat.minAdoption);
  const sup = supplementaryWeeks(child, cfg);
  const combined = plan.variant === "combined";
  const motherInsured = motherElig.insured;
  const fatherInsured = !!(fatherElig?.insured && fatherBase);
  const segments: BenefitSegment[] = [];
  const nonTransferable = par.weeks > 0 ? cfg.leave.nonTransferableWeeks : 0;
  const motherPayer = motherElig.payer.payer === "pracodawca" ? "pracodawca" : "zus";
  const fatherPayer = fatherElig?.payer.payer === "pracodawca" ? "pracodawca" : "zus";

  // ---------------- Urlop macierzyński / na warunkach macierzyńskiego ----------------
  const beforeWeeks = child.path === "biologiczny" && !child.stillbirth ? Math.min(plan.maternityStartBeforeBirthWeeks, cfg.leave.maternityMaxBeforeBirthWeeks) : 0;
  const matStart = addDays(event, -beforeWeeks * 7);
  let matDays = mat.weeks * 7;
  // zgon dziecka (art. 180¹ KP / art. 29a ustawy): 8 tyg. po porodzie, nie krócej niż 7 dni od zgonu
  if (child.childDeathDate && !child.stillbirth) {
    const lifeDays = diffDays(event, child.childDeathDate);
    const minEnd = addDays(child.childDeathDate, cfg.leave.stillbirthMinDaysAfterDeath - 1);
    const eightWeeksEnd = addDays(event, cfg.leave.maternitySpecialWeeks * 7 - 1);
    const endIso = lifeDays < cfg.leave.maternitySpecialWeeks * 7 ? (minEnd > eightWeeksEnd ? minEnd : eightWeeksEnd) : minEnd;
    matDays = Math.min(matDays, diffDays(matStart, endIso) + 1);
  }
  const matEnd = addDays(matStart, matDays - 1);
  const motherMatRate = combined ? cfg.rates.combined : cfg.rates.maternity;
  const fatherTakeover = plan.fatherTakesMaternityAfterWeeks && fatherInsured && mat.weeks > cfg.leave.maternityMinMotherWeeks && !child.childDeathDate
    ? Math.max(cfg.leave.maternityMinMotherWeeks, plan.fatherTakesMaternityAfterWeeks)
    : null;
  const matLabel = child.path === "biologiczny" ? "Zasiłek macierzyński – urlop macierzyński" : "Zasiłek macierzyński – urlop na warunkach macierzyńskiego";
  const matLegal = [{ act: "ustawa zasiłkowa" as const, article: combined ? "art. 31 ust. 3" : "art. 31 ust. 1" }, { act: "Kodeks pracy" as const, article: child.path === "biologiczny" ? "art. 180" : "art. 183" }];

  if (matDays > 0) {
    if (fatherTakeover && beforeWeeks * 7 + fatherTakeover * 7 < matDays) {
      const motherDays = beforeWeeks * 7 + fatherTakeover * 7;
      const mEnd = addDays(matStart, motherDays - 1);
      if (motherInsured) segments.push(seg("mat-m", "macierzynski", matLabel, motherPayer, matStart, mEnd, motherDays, motherMatRate, motherBase.dailyBase, matLegal));
      segments.push(seg("mat-f", "macierzynski", "Zasiłek macierzyński – przejęta część urlopu macierzyńskiego", fatherPayer, addDays(mEnd, 1), matEnd, matDays - motherDays, cfg.rates.maternity, fatherBase!.dailyBase, [{ act: "Kodeks pracy", article: "art. 180 § 5" }], "ojciec"));
    } else if (motherInsured) {
      segments.push(seg("mat-m", "macierzynski", matLabel, motherPayer, matStart, matEnd, matDays, motherMatRate, motherBase.dailyBase, matLegal));
    }
  }

  // ---------------- Uzupełniający urlop macierzyński ----------------
  let cursor = addDays(matEnd, 1);
  if (sup.weeks > 0 && !child.childDeathDate) {
    const days = sup.weeks * 7;
    const to = addDays(cursor, days - 1);
    if (motherInsured) segments.push(seg("sup-m", "uzupelniajacy", "Zasiłek macierzyński – uzupełniający urlop macierzyński", motherPayer, cursor, to, days, cfg.rates.maternity, motherBase.dailyBase, [{ act: "ustawa zasiłkowa", article: "art. 31 ust. 1" }, { act: "Kodeks pracy", article: "art. 180²" }]));
    else if (fatherInsured) segments.push(seg("sup-f", "uzupelniajacy", "Zasiłek macierzyński – uzupełniający urlop macierzyński", fatherPayer, cursor, to, days, cfg.rates.maternity, fatherBase!.dailyBase, [{ act: "Kodeks pracy", article: "art. 180²" }], "ojciec"));
    cursor = addDays(to, 1);
  }

  // ---------------- Urlop rodzicielski ----------------
  const transferablePool = Math.max(0, par.weeks - nonTransferable);
  let motherPar = motherInsured && !child.childDeathDate ? Math.min(Math.max(0, plan.motherParentalWeeks), transferablePool) : 0;
  const fatherMax = par.weeks - motherPar;
  let fatherPar = fatherInsured && !child.childDeathDate ? Math.min(Math.max(0, plan.fatherParentalWeeks), fatherMax) : 0;
  if (par.weeks === 0) { motherPar = 0; fatherPar = 0; }

  const work = plan.combineWithWork;
  const workFraction = Math.min(Math.max(work.fraction, 0), cfg.leave.parentalMaxWorkFraction);
  let extensionDays = 0;

  const motherParStart = cursor;
  const pushParental = (who: "matka" | "ojciec", weeks: number, start: string, dailyBase: number, payer: "pracodawca" | "zus") => {
    if (weeks <= 0) return start;
    let s = start;
    let left = weeks;
    // część niezbywalna ojca (9 tyg.) przy wariancie 81,5% – zawsze 70% (art. 31 ust. 3f)
    const fatherNt = who === "ojciec" ? Math.min(left, nonTransferable) : 0;
    const rateRest = combined ? cfg.rates.combined : cfg.rates.parental;
    const combinedWeeks = work.enabled && work.who === who ? Math.min(work.weeks, weeks) : 0;
    const normalWeeks = left - combinedWeeks;
    // kolejność: najpierw część „zwykła”, potem łączona z pracą
    const pieces: { weeks: number; nt: boolean; work: boolean }[] = [];
    let ntLeft = fatherNt;
    let normalLeft = normalWeeks;
    if (normalLeft > 0) {
      const ntInNormal = Math.min(ntLeft, normalLeft);
      if (normalLeft - ntInNormal > 0) pieces.push({ weeks: normalLeft - ntInNormal, nt: false, work: false });
      if (ntInNormal > 0) pieces.push({ weeks: ntInNormal, nt: true, work: false });
      ntLeft -= ntInNormal;
      normalLeft = 0;
    }
    if (combinedWeeks > 0) pieces.push({ weeks: combinedWeeks, nt: ntLeft > 0, work: true });
    for (const [i, pc] of pieces.entries()) {
      let days = pc.weeks * 7;
      let ext = 0;
      if (pc.work) {
        ext = Math.floor(days * workFraction); // art. 182¹f § 2 i § 4 – niepełny dzień pomija się
        extensionDays += ext;
        days += ext;
      }
      const to = addDays(s, days - 1);
      const rate = pc.nt ? cfg.rates.nonTransferable : rateRest;
      const label = pc.work
        ? `Zasiłek macierzyński – rodzicielski łączony z pracą (${Math.round(workFraction * 100)}% etatu)`
        : pc.nt
          ? "Zasiłek macierzyński – rodzicielski (9 tyg. niezbywalne)"
          : "Zasiłek macierzyński – urlop rodzicielski";
      segments.push(
        seg(`par-${who}-${i}`, pc.work ? "rodzicielski_praca" : pc.nt ? "rodzicielski_niezbywalny" : "rodzicielski", label, payer, s, to, days, rate, dailyBase,
          [
            { act: "ustawa zasiłkowa", article: pc.nt ? "art. 31 ust. 3f" : combined ? "art. 31 ust. 3" : "art. 31 ust. 2" },
            ...(pc.work ? [{ act: "ustawa zasiłkowa" as const, article: "art. 31 ust. 4a" }, { act: "Kodeks pracy" as const, article: "art. 182¹e–182¹f" }] : [{ act: "Kodeks pracy" as const, article: "art. 182¹a" }]),
          ],
          who, pc.work ? workFraction : 0),
      );
      s = addDays(to, 1);
      void left;
    }
    left = 0;
    return s;
  };

  const afterMother = pushParental("matka", motherPar, motherParStart, motherBase.dailyBase, motherPayer);
  if (fatherPar > 0 && fatherBase) {
    const fStart = plan.simultaneous ? motherParStart : afterMother;
    pushParental("ojciec", fatherPar, fStart, fatherBase.dailyBase, fatherPayer);
  }

  // ---------------- Urlop ojcowski ----------------
  if (plan.paternity.enabled && fatherInsured && fatherBase && !child.stillbirth) {
    const pLegal = [{ act: "ustawa zasiłkowa" as const, article: "art. 31 ust. 1" }, { act: "Kodeks pracy" as const, article: "art. 182³" }];
    if (plan.paternity.split === "2x7") {
      segments.push(seg("pat-1", "ojcowski", "Zasiłek macierzyński – urlop ojcowski (cz. 1)", fatherPayer, event, addDays(event, 6), 7, cfg.rates.maternity, fatherBase.dailyBase, pLegal, "ojciec"));
      const s2 = addDays(event, 28); // druga część – przykładowo po 4 tygodniach (dowolnie do 12. miesiąca życia)
      segments.push(seg("pat-2", "ojcowski", "Zasiłek macierzyński – urlop ojcowski (cz. 2)", fatherPayer, s2, addDays(s2, 6), 7, cfg.rates.maternity, fatherBase.dailyBase, pLegal, "ojciec"));
    } else {
      segments.push(seg("pat", "ojcowski", "Zasiłek macierzyński – urlop ojcowski", fatherPayer, event, addDays(event, cfg.leave.paternityWeeks * 7 - 1), cfg.leave.paternityWeeks * 7, cfg.rates.maternity, fatherBase.dailyBase, pLegal, "ojciec"));
    }
  }

  // ---------------- Podwyższenie do kwoty świadczenia rodzicielskiego (art. 31 ust. 3a) ----------------
  for (const s of segments) {
    if (s.workReduction) continue;
    if (s.monthlyAmount < cfg.amounts.parentalBenefit) {
      const daily = round2(cfg.amounts.parentalBenefit / 30);
      s.dailyAmount = daily;
      s.monthlyAmount = cfg.amounts.parentalBenefit;
      s.total = round2(daily * s.days);
      s.raisedToParentalBenefit = true;
      s.legal = [...s.legal, { act: "ustawa zasiłkowa", article: "art. 31 ust. 3a" }];
    }
  }

  const maxExtended = par.maxExtended;
  const parentalTotalWeeks = motherPar + fatherPar;
  const extendedWeeks = Math.min(maxExtended, round2((parentalTotalWeeks * 7 + extensionDays) / 7));

  return {
    segments,
    meta: {
      maternityWeeks: round2(matDays / 7),
      supplementaryWeeks: sup.weeks,
      supplementaryReason: sup.reason,
      parentalWeeks: par.weeks,
      parentalExtendedWeeks: extendedWeeks,
      parentalExtensionDays: extensionDays,
      nonTransferableWeeks: nonTransferable,
      paternityWeeks: plan.paternity.enabled && fatherInsured ? cfg.leave.paternityWeeks : 0,
      adoptionNote: mat.adoptionNote,
      motherParentalWeeks: motherPar,
      fatherParentalWeeks: fatherPar,
      maternityStart: matStart,
      maternityEnd: matEnd,
      maxExtended,
    },
  };
}

/** Porównywarka wariantów: 100% + 70% vs 81,5% (art. 31 ust. 1–4). */
export function compareVariants(motherDailyBase: number, maternityDays: number, motherParentalDays: number, cfg: LegalConfig, child: ChildEvent): VariantComparison {
  const floor = (monthly: number) => Math.max(monthly, cfg.amounts.parentalBenefit);
  const matMonthly = floor(round2(motherDailyBase * cfg.rates.maternity * 30));
  const parMonthly = floor(round2(motherDailyBase * cfg.rates.parental * 30));
  const combMonthly = floor(round2(motherDailyBase * cfg.rates.combined * 30));
  const standardTotal = round2((matMonthly / 30) * maternityDays + (parMonthly / 30) * motherParentalDays);
  const combinedTotal = round2((combMonthly / 30) * (maternityDays + motherParentalDays));
  const equalization = round2(Math.max(0, (matMonthly - combMonthly) / 30) * maternityDays);
  const diff = round2(standardTotal - combinedTotal);
  const firstBirthday = child.birthDate ?? child.dueDate;
  void firstBirthday;
  return {
    standard: { total: standardTotal, monthlyFirst: matMonthly, monthlyLater: parMonthly, label: `${Math.round(cfg.rates.maternity * 100)}% przez macierzyński, potem ${Math.round(cfg.rates.parental * 100)}%` },
    combined: { total: combinedTotal, monthly: combMonthly, label: `${(cfg.rates.combined * 100).toFixed(1).replace(".", ",")}% przez cały okres (wniosek do ${cfg.deadlines.combinedApplicationDays} dni po porodzie)`, equalization },
    difference: diff,
    recommendation: Math.abs(diff) < 50 ? "equal" : diff > 0 ? "standard" : "combined",
    note:
      Math.abs(diff) < 50
        ? "Łączna kwota jest praktycznie taka sama – wariant 81,5% daje równe, przewidywalne przelewy; wariant 100%/70% więcej na start."
        : diff > 0
          ? "Wariant 100% + 70% daje wyższą łączną kwotę przy planowanym podziale urlopu."
          : "Wariant 81,5% daje wyższą łączną kwotę przy planowanym podziale urlopu.",
  };
}

export function childAgeLimitInfo(birthIso: string, onIso: string) {
  return ageOn(birthIso, onIso);
}
