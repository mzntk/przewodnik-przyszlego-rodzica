/**
 * Testy deterministycznego silnika uprawnień – każda asercja odpowiada konkretnemu przepisowi.
 * Uruchom: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../src/services/engine";
import { computeBase } from "../src/services/engine/base";
import { routePayer, debtCheck } from "../src/services/engine/eligibility";
import { supplementaryWeeks, maternityWeeksFor, parentalWeeksFor } from "../src/services/engine/maternity";
import { DEFAULT_LEGAL_CONFIG_2026 as cfg } from "../src/models/legal-config";
import { TEST_PROFILES, emptyCase, buildIncomeHistory } from "../src/data/profiles";
import type { CaseInput, ParentProfile } from "../src/models/types";
import { validatePesel, validateNip } from "../src/services/documents/identifiers";

const r2 = (n: number) => Math.round(n * 100) / 100;
const base = (): ParentProfile => structuredClone(emptyCase().mother);
const input = (patch: (c: CaseInput) => void): CaseInput => {
  const c: CaseInput = { ...structuredClone(emptyCase()), asOf: "2026-11-21" };
  patch(c);
  return c;
};

test("art. 45 – gwarancja minimalnej podstawy dla pełnego etatu", () => {
  const p = base();
  p.incomeHistory = buildIncomeHistory("2026-10", 12, 3000);
  const b = computeBase(p, "2026-11-15", cfg);
  assert.equal(b.base, r2(cfg.minWage * (1 - cfg.socialContributionRate)));
  assert.ok(b.minimumApplied);
});

test("art. 36 + art. 38 ust. 2 – wyłączenie miesiąca < 1/2 i uzupełnienie ≥ 1/2", () => {
  const p = base();
  p.incomeHistory = buildIncomeHistory("2026-10", 12, 8000, { "2026-05": { gross: 2000, workedDays: 5, requiredDays: 21 }, "2026-06": { gross: 6000, workedDays: 15, requiredDays: 20, fixedContract: 8000 } });
  const b = computeBase(p, "2026-11-10", cfg);
  assert.deepEqual(b.excludedMonths, ["2026-05"]);
  assert.deepEqual(b.supplementedMonths, ["2026-06"]);
  assert.equal(b.includedMonths, 11);
  assert.equal(b.base, r2(8000 * (1 - 0.1371)));
});

test("art. 48a – JDG z deklarowaną podstawą i stażem 3 miesięcy", () => {
  const p = base();
  p.title = "jdg";
  p.voluntarySickness = true;
  p.insuranceStart = "2026-05-01";
  p.incomeHistory = buildIncomeHistory("2026-07", 3, 9000);
  const b = computeBase(p, "2026-08-03", cfg);
  const d = 1 - cfg.socialContributionRate;
  assert.equal(b.method, "niepracownik_48a");
  assert.equal(b.base, r2(cfg.jdgMinBase * d + (((9000 - cfg.jdgMinBase) * d) / 12) * 3));
});

test("art. 61 – routing płatnika: 20 → ZUS, 21 → pracodawca, JDG → ZUS", () => {
  const p = base();
  p.payer = { name: "X", nip: "", insuredCount: 20 };
  assert.equal(routePayer(p, cfg, { benefit: "macierzynski" }).payer, "zus");
  p.payer.insuredCount = 21;
  assert.equal(routePayer(p, cfg, { benefit: "macierzynski" }).payer, "pracodawca");
  p.title = "jdg";
  assert.equal(routePayer(p, cfg, { benefit: "macierzynski" }).payer, "zus");
});

test("art. 2a – próg zadłużenia 1% płacy minimalnej i przedawnienie po 6 mies.", () => {
  const p = base();
  p.title = "jdg";
  p.contributionDebt = 48.06;
  assert.equal(debtCheck(p, "2027-01-30", cfg).blocked, false);
  p.contributionDebt = 48.07;
  const d = debtCheck(p, "2027-01-30", cfg);
  assert.equal(d.blocked, true);
  assert.equal(d.expiresOn, "2027-07-30");
});

test("art. 180² KP – uzupełniający urlop macierzyński", () => {
  const c = emptyCase().child;
  assert.equal(supplementaryWeeks({ ...c, gestationWeek: 27, birthWeightsG: [940, 1080], hospitalizationDays: [52, 38] }, cfg).weeks, 8);
  assert.equal(supplementaryWeeks({ ...c, gestationWeek: 26, birthWeightsG: [800], hospitalizationDays: [140] }, cfg).weeks, 15);
  assert.equal(supplementaryWeeks({ ...c, gestationWeek: 33, birthWeightsG: [1500], hospitalizationDays: [70] }, cfg).weeks, 8);
  assert.equal(supplementaryWeeks({ ...c, gestationWeek: 39, birthWeightsG: [3400], hospitalizationDays: [10], hospitalizationStartDay: 6 }, cfg).weeks, 2);
  assert.equal(supplementaryWeeks({ ...c, gestationWeek: 39, birthWeightsG: [3400], hospitalizationDays: [10], hospitalizationStartDay: 3 }, cfg).weeks, 0);
});

test("art. 180 i 182¹a KP – wymiary: bliźnięta 31 + 43, „Za życiem” 65", () => {
  const c = { ...emptyCase().child, childrenCount: 2 };
  assert.equal(maternityWeeksFor(c, cfg).weeks, 31);
  assert.equal(parentalWeeksFor(c, cfg, false).weeks, 43);
  assert.equal(parentalWeeksFor({ ...c, childrenCount: 1, zaZyciem: true }, cfg, false).weeks, 65);
});

test("art. 183 KP – adopcja 13-latka: 9 tyg. na warunkach macierzyńskiego + 38 tyg. rodzicielskiego", () => {
  const c = { ...emptyCase().child, path: "adopcja" as const, childAgeYears: 13.9 };
  const m = maternityWeeksFor(c, cfg);
  assert.equal(m.weeks, 9);
  assert.equal(parentalWeeksFor(c, cfg, m.minAdoption).weeks, 38);
});

test("art. 182¹f KP i art. 31 ust. 4a – łączenie z pracą na 1/2 etatu przez 16 tyg.", () => {
  const r = calculate(input((c) => { c.plan.combineWithWork = { enabled: true, who: "matka", fraction: 0.5, weeks: 16 }; }), cfg);
  const seg = r.segments.find((s) => s.kind === "rodzicielski_praca")!;
  assert.equal(r.leave.parentalExtensionDays, 56);
  assert.equal(seg.days, 16 * 7 + 56);
  assert.equal(seg.workReduction, 0.5);
  assert.equal(seg.dailyAmount, r2(r.mother.base.dailyBase * cfg.rates.parental * 0.5));
});

test("art. 31 ust. 3 i 3f – wariant 81,5%, 9 tyg. taty zawsze 70%", () => {
  const r = calculate({ ...structuredClone(TEST_PROFILES[2].input), asOf: "2026-11-21" }, cfg);
  const mat = r.segments.find((s) => s.id === "mat-m")!;
  assert.equal(mat.rate, cfg.rates.combined);
  const nt = r.segments.find((s) => s.kind === "rodzicielski_niezbywalny" && s.who === "ojciec")!;
  assert.equal(nt.rate, cfg.rates.nonTransferable);
  assert.equal(r.leave.supplementaryWeeks, 8);
});

test("art. 31 ust. 3a – podwyższenie zasiłku do kwoty świadczenia rodzicielskiego", () => {
  const r = calculate(input((c) => { c.mother.workTimeFraction = 0.25; c.mother.incomeHistory = buildIncomeHistory("2026-10", 12, 1200); }), cfg);
  const par = r.segments.find((s) => s.kind === "rodzicielski")!;
  assert.equal(par.monthlyAmount, cfg.amounts.parentalBenefit);
  assert.ok(par.raisedToParentalBenefit);
});

test("art. 9 ust. 2 – reset okresu zasiłkowego przy zwolnieniu z kodem B po przerwie", () => {
  const r = calculate({ ...structuredClone(TEST_PROFILES[0].input), asOf: "2026-11-21" }, cfg);
  assert.equal(r.mother.sickness.resetByCodeB, true);
  assert.equal(r.mother.sickness.employerDays, 33);
});

test("art. 6 ust. 4 u.s.u.s. – student na zleceniu: brak ubezpieczenia → świadczenie rodzicielskie", () => {
  const r = calculate({ ...structuredClone(TEST_PROFILES[3].input), asOf: "2026-11-21" }, cfg);
  assert.equal(r.mother.eligibility.insured, false);
  assert.equal(r.familyBenefits.find((b) => b.id === "kosiniakowe")!.eligible, true);
  assert.equal(r.totals.mother, 0);
});

test("Konfiguracja z panelu admina zmienia wynik bez zmiany kodu", () => {
  const custom = structuredClone(cfg);
  custom.rates.parental = 0.75;
  const r = calculate({ ...structuredClone(TEST_PROFILES[0].input), asOf: "2026-11-21" }, custom);
  assert.equal(r.segments.find((s) => s.kind === "rodzicielski")!.rate, 0.75);
});

test("Walidacja PESEL i NIP (sumy kontrolne)", () => {
  assert.equal(validatePesel("92071808463").valid, true);
  assert.equal(validatePesel("85010112346").valid, false);
  assert.equal(validateNip("6762481231").valid, true);
  assert.equal(validateNip("1234567890").valid, false);
});
