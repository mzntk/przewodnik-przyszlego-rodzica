/**
 * Ocena sprawy na podstawie (scalonych) danych z dokumentów: mapowanie na CaseInput → DETERMINISTYCZNY silnik → werdykt.
 * Wspólne dla analizy pojedynczego PDF, całej teczki dokumentów i ręcznej korekty odczytanych pól.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { CaseEvaluation, ExtractedDocument, Verdict } from "@/models/document";
import type { CaseInput, InsuranceTitle } from "@/models/types";
import { validatePesel } from "./identifiers";
import { calculate } from "@/services/engine";
import { emptyCase } from "@/data/profiles";
import { addDays, round2 } from "@/services/engine/dates";

const FORM_DEFAULT_TITLE: Partial<Record<ExtractedDocument["formType"], InsuranceTitle>> = { "Z-3": "uop", "ZAS-12": "uop", "Z-3a": "zlecenie", "ZAS-53": "jdg" };

export function documentToCase(doc: ExtractedDocument, asOf: string): CaseInput {
  const base = emptyCase();
  const title: InsuranceTitle = doc.title ?? FORM_DEFAULT_TITLE[doc.formType] ?? (doc.formType === "ZAM" ? "zlecenie" : "uop");
  const event = doc.child.birthDate ?? doc.child.dueDate ?? doc.benefit.from ?? doc.sickLeaves[0]?.from ?? addDays(asOf, 60);
  const voluntary = title === "uop" ? false : (doc.voluntarySickness ?? (["ZAM", "ZAS-53", "Z-3a", "POSWIADCZENIE"].includes(doc.formType) && title !== "student_zlecenie"));
  return {
    asOf,
    mother: {
      ...base.mother,
      firstName: doc.insured.firstName ?? "",
      lastName: doc.insured.lastName ?? "",
      pesel: doc.insured.pesel ?? "",
      birthDate: doc.insured.birthDate ?? base.mother.birthDate,
      role: doc.insured.pesel && validatePesel(doc.insured.pesel).sex === "M" ? "ojciec" : "matka",
      title,
      voluntarySickness: voluntary,
      insuranceStart: doc.insuranceStart ?? addDays(event, -400),
      contractEndDate: doc.insuranceEnd ?? undefined,
      payer: { name: doc.payer.name ?? "", nip: doc.payer.nip ?? "", insuredCount: doc.payer.insuredCount ?? 0 },
      workTimeFraction: doc.workTimeFraction ?? 1,
      incomeHistory: doc.incomeMonths.map((m) => ({ month: m.month, gross: m.gross, fixedContract: m.gross, workedDays: m.workedDays ?? undefined, requiredDays: m.requiredDays ?? undefined })),
      declaredBase: doc.declaredBase ?? undefined,
      contributionDebt: doc.contributionDebt ?? undefined,
      sickLeaves: doc.sickLeaves.map((l, i) => ({ id: `doc-${i}`, from: l.from, to: l.to, codeB: l.codeB, issuer: l.series ?? undefined })),
    },
    child: {
      path: doc.child.adoption ? "adopcja" : "biologiczny",
      dueDate: doc.child.dueDate ?? event,
      birthDate: doc.child.birthDate ?? undefined,
      childrenCount: doc.child.childrenCount ?? 1,
      zaZyciem: doc.child.zaZyciem ?? false,
      gestationWeek: doc.child.gestationWeek ?? undefined,
      birthWeightsG: doc.child.birthWeightG ? [doc.child.birthWeightG] : undefined,
      hospitalizationDays: doc.child.hospitalizationDays ? [doc.child.hospitalizationDays] : undefined,
      childAgeYears: doc.child.adoption ? 1 : undefined,
    },
    plan: { ...base.plan, variant: doc.benefit.variant815 ? "combined" : "standard", fatherParentalWeeks: 0, paternity: { enabled: false, split: "jednorazowo" } },
    family: base.family,
  };
}

/** Werdykt silnika dla danych z dokumentu (lub teczki dokumentów). AI nie bierze w tym udziału. */
export function evaluateDocument(doc: ExtractedDocument, cfg: LegalConfig, asOf: string): Omit<CaseEvaluation, "fieldFrom" | "issues"> {
  const input = documentToCase(doc, asOf);
  const result = calculate(input, cfg);
  const event = input.child.birthDate ?? input.child.dueDate;
  const sicknessDoc = doc.formType === "ZAS-53" || doc.formType === "E-ZLA" || (doc.sickLeaves.length > 0 && !doc.child.dueDate && !doc.child.birthDate);
  const endedBefore = !!doc.insuranceEnd && doc.insuranceEnd < event && input.mother.title !== "uop";
  let insured = result.mother.eligibility.insured && !endedBefore;
  let insuredLabel = endedBefore ? "NIE – tytuł ubezpieczenia ustał przed dniem porodu" : result.mother.eligibility.insuredLabel;
  if (doc.decision && /odmow|nie przysługuje|nie podlega/i.test(doc.decision) && !insured) insuredLabel += " (zgodnie z dokumentem)";
  if (!doc.insured.pesel && !doc.title && !doc.insuranceStart) {
    insured = false;
    insuredLabel = "NIE USTALONO – brak danych o tytule ubezpieczenia w dokumencie";
  }
  const legalBasis = insured
    ? `${result.mother.eligibility.legal.map((l) => `${l.article} ${l.act}`).join("; ")}; art. ${sicknessDoc ? "6" : "29 ust. 1"} ustawy zasiłkowej`
    : endedBefore
      ? "art. 29 ust. 1 ustawy zasiłkowej (brak ubezpieczenia w dniu porodu)"
      : `${result.mother.eligibility.legal.map((l) => `${l.article} ${l.act}`).join("; ")}`;

  const matSegs = result.segments.filter((s) => s.who === "matka" && !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind));
  const sickSegs = result.segments.filter((s) => s.who === "matka" && s.kind === "chorobowy");
  const segs = sicknessDoc ? sickSegs : matSegs;
  const paternityDoc = /ojcowsk/i.test(doc.benefit.type ?? "");
  if (paternityDoc && insured) {
    const daily = Math.max(result.mother.base.dailyBase * cfg.rates.maternity, cfg.amounts.parentalBenefit / 30);
    const days = cfg.leave.paternityWeeks * 7;
    segs.splice(0, segs.length, { id: "pat-doc", kind: "ojcowski", label: "Urlop ojcowski", who: "ojciec", payer: result.mother.eligibility.payer.payer === "zus" ? "zus" : "pracodawca", from: event, to: addDays(event, days - 1), days, weeks: days / 7, rate: cfg.rates.maternity, dailyAmount: round2(daily), monthlyAmount: round2(daily * 30), total: round2(daily * days), legal: [{ act: "Kodeks pracy", article: "art. 182³" }] });
  }
  const base = sicknessDoc ? result.mother.sicknessBase : result.mother.base;
  const first = segs[0];
  const verdict: Verdict = {
    insured,
    insuredLabel,
    legalBasis,
    payer: result.mother.eligibility.payer.payerLabel,
    payerReason: result.mother.eligibility.payer.reason,
    benefitLabel: paternityDoc ? "Zasiłek macierzyński – urlop ojcowski" : sicknessDoc ? "Zasiłek chorobowy" : input.child.path === "biologiczny" ? "Zasiłek macierzyński" : "Zasiłek macierzyński (na warunkach urlopu macierzyńskiego)",
    monthly: insured ? (first?.monthlyAmount ?? 0) : 0,
    dailyBase: base.dailyBase,
    base: base.base,
    rateLabel: first ? `${round2(first.rate * 100)}%` : "—",
    periodFrom: insured ? (segs[0]?.from ?? null) : null,
    periodTo: insured ? (segs.at(-1)?.to ?? null) : null,
    totalWeeks: insured ? round2(segs.reduce((s, x) => s + x.days, 0) / 7) : 0,
    total: insured ? round2(segs.reduce((s, x) => s + x.total, 0)) : 0,
    blockedByDebt: result.mother.eligibility.debtBlock.blocked,
    segments: insured ? segs.map((s) => ({ label: s.label, from: s.from, to: s.to, weeks: round2(s.days / 7), rate: s.rate, monthly: s.monthlyAmount, total: s.total })) : [],
  };
  return { document: doc, caseInput: input, verdict, base };
}
