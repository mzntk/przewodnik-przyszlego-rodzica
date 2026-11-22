/**
 * Ocena sprawy na podstawie (scalonych) danych z dokumentów: mapowanie na CaseInput → DETERMINISTYCZNY silnik → werdykt.
 * Wspólne dla analizy pojedynczego PDF, całej teczki dokumentów i ręcznej korekty odczytanych pól.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { CaseEvaluation, ExtractedDocument, Verdict } from "@/models/document";
import type { CaseInput, InsuranceTitle, ParentProfile } from "@/models/types";
import { validatePesel } from "./identifiers";
import { calculate } from "@/services/engine";
import { emptyCase } from "@/data/profiles";
import { addDays, round2 } from "@/services/engine/dates";

const FORM_DEFAULT_TITLE: Partial<Record<ExtractedDocument["formType"], InsuranceTitle>> = { "Z-3": "uop", "ZAS-12": "uop", "Z-3a": "zlecenie", "ZAS-53": "jdg" };
const JDG_TITLES: InsuranceTitle[] = ["jdg", "jdg_preferencyjna", "maly_zus_plus", "ulga_na_start"];

/** Dane sprawy z aplikacji (profil rodziny: mObywatel, ZUS, kalkulator) – bez daty „dziś”. */
export type ProfileInput = Omit<CaseInput, "asOf">;
export type Applicant = "matka" | "ojciec";

const norm = (s?: string | null) => (s ?? "").toLocaleUpperCase("pl-PL").replace(/\s+/g, " ").trim();

/** Czyje dane zawiera dokument: dopasowanie po PESEL (a bez PESEL – po imieniu i nazwisku). null = inna osoba. */
export function matchProfile(doc: ExtractedDocument, profile?: ProfileInput | null): Applicant | null {
  if (!profile) return null;
  const pesel = doc.insured.pesel?.replace(/\D/g, "");
  if (pesel) return pesel === profile.mother.pesel ? "matka" : profile.father && pesel === profile.father.pesel ? "ojciec" : null;
  const same = (p?: ParentProfile) => !!p && !!doc.insured.lastName && norm(p.lastName) === norm(doc.insured.lastName) && (!doc.insured.firstName || norm(p.firstName) === norm(doc.insured.firstName));
  return same(profile.mother) ? "matka" : same(profile.father) ? "ojciec" : null;
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/**
 * Uzupełnia puste pola dokumentu danymi z aplikacji (tej samej osoby). Wartości z dokumentu zostają – to one są sprawdzane.
 * Zwraca dokument i listę ścieżek uzupełnionych z aplikacji (w edytorze oznaczone „z aplikacji”).
 */
export function fillDocFromProfile(doc: ExtractedDocument, profile: ProfileInput, who: Applicant): { document: ExtractedDocument; filled: string[] } {
  const p = who === "ojciec" && profile.father ? profile.father : profile.mother;
  const ch = profile.child;
  const kid = ch.kids?.[0];
  const out = structuredClone(doc);
  const filled: string[] = [];
  const set = (path: string, v: unknown) => {
    if (isEmpty(v)) return;
    const keys = path.split(".");
    let cur = out as unknown as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
    if (!isEmpty(cur[keys.at(-1)!])) return;
    cur[keys.at(-1)!] = v;
    filled.push(path);
  };
  set("insured.firstName", p.firstName);
  set("insured.lastName", p.lastName);
  set("insured.pesel", p.pesel);
  set("insured.birthDate", p.birthDate);
  const payer = JDG_TITLES.includes(p.title) && p.business ? { name: p.business.name, nip: p.business.nip, regon: p.business.regon, insuredCount: null } : p.payer ? { name: p.payer.name, nip: p.payer.nip, regon: p.payer.regon ?? null, insuredCount: p.payer.insuredCount } : null;
  if (payer) {
    set("payer.name", payer.name);
    set("payer.nip", payer.nip);
    set("payer.regon", payer.regon);
    set("payer.insuredCount", payer.insuredCount);
  }
  set("title", p.title);
  if (p.title !== "uop") set("voluntarySickness", p.voluntarySickness);
  set("insuranceStart", p.insuranceStart);
  set("insuranceEnd", p.contractEndDate);
  if (p.title === "uop") set("workTimeFraction", p.workTimeFraction);
  set("incomeMonths", p.incomeHistory.map((m) => ({ month: m.month, gross: m.gross, workedDays: m.workedDays ?? null, requiredDays: m.requiredDays ?? null })));
  set("declaredBase", p.declaredBase);
  set("contributionDebt", p.contributionDebt);
  set("bankAccount", p.bankAccount?.replace(/\D/g, ""));
  set("child.dueDate", ch.dueDate);
  set("child.birthDate", ch.birthDate);
  set("child.childrenCount", ch.childrenCount);
  set("child.zaZyciem", ch.zaZyciem);
  set("child.gestationWeek", ch.gestationWeek);
  set("child.birthWeightG", ch.birthWeightsG?.[0]);
  set("child.hospitalizationDays", ch.hospitalizationDays?.[0]);
  set("child.adoption", ch.path !== "biologiczny" ? true : null);
  set("child.firstName", kid?.fullName || kid?.name);
  set("child.pesel", kid?.pesel);
  set("sickLeaves", p.sickLeaves.map((l) => ({ series: l.issuer ?? null, from: l.from, to: l.to, codeB: l.codeB })));
  return { document: out, filled };
}

/** Dane z dokumentu nakładamy na profil tej samej osoby: wynik = kalkulator aplikacji, ale z wartościami z druku. */
function overlayProfile(doc: ExtractedDocument, profile: ProfileInput, who: Applicant, asOf: string): CaseInput {
  const input: CaseInput = { ...structuredClone(profile), asOf };
  const p = who === "ojciec" && input.father ? input.father : input.mother;
  const i = doc.insured;
  if (i.firstName) p.firstName = i.firstName;
  if (i.lastName) p.lastName = i.lastName;
  if (i.pesel) p.pesel = i.pesel;
  if (doc.title) p.title = doc.title;
  if (doc.voluntarySickness !== null && p.title !== "uop") p.voluntarySickness = doc.voluntarySickness;
  if (doc.insuranceStart) p.insuranceStart = doc.insuranceStart;
  if (doc.insuranceEnd) p.contractEndDate = doc.insuranceEnd;
  if (doc.workTimeFraction) p.workTimeFraction = doc.workTimeFraction;
  if (!JDG_TITLES.includes(p.title) && (doc.payer.name || doc.payer.nip || doc.payer.insuredCount !== null)) {
    const cur = p.payer;
    // druk Z-3 / Z-3a podaje tylko „do 20” / „powyżej 20” – dokładną liczbę z profilu zostawiamy, jeśli to ta sama strona progu
    const docCount = doc.payer.insuredCount;
    const count = docCount === null ? (cur?.insuredCount ?? 0) : cur && (cur.insuredCount > 20) === (docCount > 20) ? cur.insuredCount : docCount;
    p.payer = { ...cur, name: doc.payer.name ?? cur?.name ?? "", nip: doc.payer.nip ?? cur?.nip ?? "", regon: doc.payer.regon ?? cur?.regon, insuredCount: count };
  }
  if (doc.incomeMonths.length) {
    const prev = new Map(p.incomeHistory.map((m) => [m.month, m]));
    p.incomeHistory = doc.incomeMonths.map((m) => ({ ...prev.get(m.month), month: m.month, gross: m.gross, fixedContract: prev.get(m.month)?.gross === m.gross ? prev.get(m.month)?.fixedContract ?? m.gross : m.gross, workedDays: m.workedDays ?? undefined, requiredDays: m.requiredDays ?? undefined }));
  }
  if (doc.declaredBase !== null) p.declaredBase = doc.declaredBase;
  if (doc.contributionDebt !== null) p.contributionDebt = doc.contributionDebt;
  if (doc.sickLeaves.length) p.sickLeaves = doc.sickLeaves.map((l, k) => ({ id: `doc-${k}`, from: l.from, to: l.to, codeB: l.codeB, issuer: l.series ?? undefined }));
  const c = doc.child;
  const ch = input.child;
  if (c.dueDate) ch.dueDate = c.dueDate;
  if (c.birthDate) ch.birthDate = c.birthDate;
  if (c.childrenCount) ch.childrenCount = c.childrenCount;
  if (c.zaZyciem !== null) ch.zaZyciem = c.zaZyciem;
  if (c.gestationWeek) ch.gestationWeek = c.gestationWeek;
  if (c.birthWeightG) ch.birthWeightsG = [c.birthWeightG, ...(ch.birthWeightsG ?? []).slice(1)];
  if (c.hospitalizationDays) ch.hospitalizationDays = [c.hospitalizationDays, ...(ch.hospitalizationDays ?? []).slice(1)];
  if (c.adoption === true && ch.path === "biologiczny") ch.path = "adopcja";
  if (c.adoption === false && ch.path !== "biologiczny") ch.path = "biologiczny";
  if (doc.benefit.variant815 !== null) input.plan = { ...input.plan, variant: doc.benefit.variant815 ? "combined" : "standard" };
  return input;
}

export function documentToCase(doc: ExtractedDocument, asOf: string, ctx?: { profile: ProfileInput; who: Applicant }): CaseInput {
  if (ctx) return overlayProfile(doc, ctx.profile, ctx.who, asOf);
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

/** Werdykt silnika dla danych z dokumentu (lub teczki dokumentów). AI nie bierze w tym udziału.
 *  Z `ctx` (dokument tej samej osoby co w aplikacji) liczymy na pełnych danych rodziny – jak kalkulator – z wartościami z druku. */
export function evaluateDocument(doc: ExtractedDocument, cfg: LegalConfig, asOf: string, ctx?: { profile: ProfileInput; who: Applicant }): Omit<CaseEvaluation, "fieldFrom" | "issues"> {
  const input = documentToCase(doc, asOf, ctx);
  const result = calculate(input, cfg);
  const who: Applicant = ctx?.who === "ojciec" && input.father ? "ojciec" : "matka";
  const person = who === "ojciec" ? input.father! : input.mother;
  const elig = who === "ojciec" && result.father ? result.father.eligibility : result.mother.eligibility;
  const event = input.child.birthDate ?? input.child.dueDate;
  const sicknessDoc = doc.formType === "ZAS-53" || doc.formType === "E-ZLA" || (doc.sickLeaves.length > 0 && !doc.child.dueDate && !doc.child.birthDate && !ctx);
  const endedBefore = !!person.contractEndDate && person.contractEndDate < event && person.title !== "uop";
  let insured = elig.insured && !endedBefore;
  let insuredLabel = endedBefore ? "NIE – tytuł ubezpieczenia ustał przed dniem porodu" : elig.insuredLabel;
  if (doc.decision && /odmow|nie przysługuje|nie podlega/i.test(doc.decision) && !insured) insuredLabel += " (zgodnie z dokumentem)";
  if (!ctx && !doc.insured.pesel && !doc.title && !doc.insuranceStart) {
    insured = false;
    insuredLabel = "NIE USTALONO – brak danych o tytule ubezpieczenia w dokumencie";
  }
  const legalBasis = insured
    ? `${elig.legal.map((l) => `${l.article} ${l.act}`).join("; ")}; art. ${sicknessDoc ? "6" : "29 ust. 1"} ustawy zasiłkowej`
    : endedBefore
      ? "art. 29 ust. 1 ustawy zasiłkowej (brak ubezpieczenia w dniu porodu)"
      : `${elig.legal.map((l) => `${l.article} ${l.act}`).join("; ")}`;

  const matSegs = result.segments.filter((s) => s.who === who && !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind));
  const sickSegs = result.segments.filter((s) => s.who === who && s.kind === "chorobowy");
  const segs = sicknessDoc ? sickSegs : matSegs;
  const paternityDoc = /ojcowsk/i.test(doc.benefit.type ?? "");
  if (paternityDoc && insured && !ctx) {
    const daily = Math.max(result.mother.base.dailyBase * cfg.rates.maternity, cfg.amounts.parentalBenefit / 30);
    const days = cfg.leave.paternityWeeks * 7;
    segs.splice(0, segs.length, { id: "pat-doc", kind: "ojcowski", label: "Urlop ojcowski", who: "ojciec", payer: elig.payer.payer === "zus" ? "zus" : "pracodawca", from: event, to: addDays(event, days - 1), days, weeks: days / 7, rate: cfg.rates.maternity, dailyAmount: round2(daily), monthlyAmount: round2(daily * 30), total: round2(daily * days), legal: [{ act: "Kodeks pracy", article: "art. 182³" }] });
  }
  const base = sicknessDoc && who === "matka" ? result.mother.sicknessBase : who === "ojciec" && result.father ? result.father.base : result.mother.base;
  const first = segs[0];
  const verdict: Verdict = {
    insured,
    insuredLabel,
    legalBasis,
    payer: elig.payer.payerLabel,
    payerReason: elig.payer.reason,
    benefitLabel: sicknessDoc ? "Zasiłek chorobowy" : who === "ojciec" || paternityDoc ? (segs.every((x) => x.kind === "ojcowski") ? "Zasiłek macierzyński – urlop ojcowski" : "Zasiłek macierzyński (tata)") : input.child.path === "biologiczny" ? "Zasiłek macierzyński" : "Zasiłek macierzyński (na warunkach urlopu macierzyńskiego)",
    monthly: insured ? (first?.monthlyAmount ?? 0) : 0,
    dailyBase: base.dailyBase,
    base: base.base,
    rateLabel: first ? `${round2(first.rate * 100)}%` : "—",
    periodFrom: insured ? (segs[0]?.from ?? null) : null,
    periodTo: insured ? (segs.at(-1)?.to ?? null) : null,
    totalWeeks: insured ? round2(segs.reduce((s, x) => s + x.days, 0) / 7) : 0,
    total: insured ? round2(segs.reduce((s, x) => s + x.total, 0)) : 0,
    blockedByDebt: elig.debtBlock.blocked,
    segments: insured ? segs.map((s) => ({ label: s.label, from: s.from, to: s.to, weeks: round2(s.days / 7), rate: s.rate, monthly: s.monthlyAmount, total: s.total })) : [],
  };
  return { document: doc, caseInput: input, verdict, base };
}
