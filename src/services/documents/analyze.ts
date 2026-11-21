/**
 * Potok analizy dokumentu: PDF → tekst (lub AI-vision dla skanów) → parser regułowy (+ mapowanie AI)
 * → walidacja formalna → mapowanie na CaseInput → DETERMINISTYCZNY silnik → werdykt.
 */
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { LegalConfig } from "@/models/legal-config";
import type { AnalysisResponse, ExtractedDocument } from "@/models/document";
import type { CaseInput, InsuranceTitle } from "@/models/types";
import { parseDocumentText } from "./parse";
import { validateDocument } from "./validate";
import { validatePesel, validateNip } from "./identifiers";
import { aiExtract } from "@/services/ai/extract";
import { AI_MODEL } from "@/services/ai/client";
import { calculate } from "@/services/engine";
import { emptyCase } from "@/data/profiles";
import { addDays, round2 } from "@/services/engine/dates";

export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { text: (text as string[]).join("\n\n--- strona ---\n\n"), pages: totalPages };
}

export async function analyzePdf(bytes: Uint8Array, fileName: string, cfg: LegalConfig, opts: { useAi: boolean; asOf: string }): Promise<AnalysisResponse> {
  const t0 = Date.now();
  let text = "";
  let pages = 0;
  try {
    const r = await extractPdfText(bytes);
    text = r.text;
    pages = r.pages;
  } catch {
    text = "";
  }
  const chars = text.replace(/\s/g, "").length;
  const scanned = pages > 0 ? chars / pages < 40 : chars < 40;

  let regexDoc = parseDocumentText(text);
  let aiDoc: ExtractedDocument | null = null;
  let aiNote: string | undefined;
  let method: AnalysisResponse["extraction"]["method"] = scanned ? "brak-tekstu" : "pdf-text";
  if (opts.useAi) {
    const r = scanned ? await aiExtract({ pdfBase64: Buffer.from(bytes).toString("base64") }) : await aiExtract({ text: text.slice(0, 60000) });
    aiDoc = r.doc;
    aiNote = r.note;
    if (aiDoc && scanned) method = "ai-vision";
  } else {
    aiNote = "Tryb bez AI – parser regułowy.";
  }
  const { doc, sources } = mergeDocs(regexDoc, aiDoc);
  regexDoc = doc;
  const issues = validateDocument(doc);
  if (scanned && !aiDoc) issues.unshift({ field: "*", severity: "warning", message: "Dokument nie ma warstwy tekstowej (skan). Włącz analizę AI (OCR) lub prześlij PDF z tekstem." });

  const input = documentToCase(doc, opts.asOf);
  const result = calculate(input, cfg);
  const event = input.child.birthDate ?? input.child.dueDate;
  const sicknessDoc = doc.formType === "ZAS-53" || doc.formType === "E-ZLA" || (doc.sickLeaves.length > 0 && !doc.child.dueDate && !doc.child.birthDate);
  const endedBefore = doc.insuranceEnd && doc.insuranceEnd < event && input.mother.title !== "uop";
  let insured = result.mother.eligibility.insured && !endedBefore;
  let insuredLabel = endedBefore ? "NIE – tytuł ubezpieczenia ustał przed dniem porodu" : result.mother.eligibility.insuredLabel;
  if (doc.decision && /odmow|nie przysługuje|nie podlega/i.test(doc.decision) && !insured) insuredLabel += " (zgodnie z dokumentem)";
  if (!doc.insured.pesel && !doc.title) {
    insured = false;
    insuredLabel = "NIE USTALONO – brak danych o tytule ubezpieczenia w dokumencie";
  }
  const legalBasis = insured
    ? `${result.mother.eligibility.legal.map((l) => `${l.article} ${l.act}`).join("; ")}; art. ${sicknessDoc ? "6" : "29 ust. 1"} ustawy zasiłkowej`
    : endedBefore
      ? "art. 29 ust. 1 ustawy zasiłkowej (brak ubezpieczenia w dniu porodu)"
      : `${result.mother.eligibility.legal.map((l) => `${l.article} ${l.act}`).join("; ")}`;

  const matSegs = result.segments.filter((s) => s.who === "matka" && !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind));
  const sickSegs = result.segments.filter((s) => s.who === "matka" && ["chorobowy"].includes(s.kind));
  const segs = sicknessDoc ? sickSegs : matSegs;
  const paternityDoc = /ojcowsk/i.test(doc.benefit.type ?? "");
  if (paternityDoc && insured) {
    const daily = Math.max(result.mother.base.dailyBase * cfg.rates.maternity, cfg.amounts.parentalBenefit / 30);
    const days = cfg.leave.paternityWeeks * 7;
    segs.splice(0, segs.length, { id: "pat-doc", kind: "ojcowski", label: "Urlop ojcowski", who: "ojciec", payer: result.mother.eligibility.payer.payer === "zus" ? "zus" : "pracodawca", from: event, to: addDays(event, days - 1), days, weeks: days / 7, rate: cfg.rates.maternity, dailyAmount: round2(daily), monthlyAmount: round2(daily * 30), total: round2(daily * days), legal: [{ act: "Kodeks pracy", article: "art. 182³" }] });
  }
  const first = segs[0];
  const verdict: AnalysisResponse["verdict"] = {
    insured,
    insuredLabel,
    legalBasis,
    payer: result.mother.eligibility.payer.payerLabel,
    payerReason: result.mother.eligibility.payer.reason,
    benefitLabel: paternityDoc ? "Zasiłek macierzyński – urlop ojcowski" : sicknessDoc ? "Zasiłek chorobowy" : input.child.path === "biologiczny" ? "Zasiłek macierzyński" : "Zasiłek macierzyński (na warunkach urlopu macierzyńskiego)",
    monthly: insured ? (first?.monthlyAmount ?? 0) : 0,
    dailyBase: result.mother.base.dailyBase,
    base: result.mother.base.base,
    rateLabel: first ? `${round2(first.rate * 100)}%` : "—",
    periodFrom: insured ? (segs[0]?.from ?? null) : null,
    periodTo: insured ? (segs.at(-1)?.to ?? null) : null,
    totalWeeks: insured ? round2(segs.reduce((s, x) => s + x.days, 0) / 7) : 0,
    total: insured ? round2(segs.reduce((s, x) => s + x.total, 0)) : 0,
    blockedByDebt: result.mother.eligibility.debtBlock.blocked,
  };
  if (!doc.incomeMonths.length && !doc.declaredBase && insured) {
    issues.push({ field: "incomeMonths", severity: "info", message: "Dokument nie zawiera danych o wynagrodzeniu/przychodzie – kwotę oszacowano od podstawy minimalnej. Dołącz Z-3/Z-3a lub poświadczenie ubezpieczenia, aby uzyskać dokładny wynik." });
  }

  return {
    fileName,
    caseInput: input,
    extraction: { method, pages, chars, scanned, aiUsed: !!aiDoc, aiModel: aiDoc ? AI_MODEL : undefined, aiNote, durationMs: Date.now() - t0 },
    document: doc,
    fieldSources: sources,
    issues,
    textPreview: text.slice(0, 4000),
    verdict,
  };
}

function mergeDocs(rx: ExtractedDocument, ai: ExtractedDocument | null): { doc: ExtractedDocument; sources: AnalysisResponse["fieldSources"] } {
  const sources: AnalysisResponse["fieldSources"] = {};
  if (!ai) {
    walk(rx, "", (p, v) => { if (v !== null && v !== undefined && !(Array.isArray(v) && !v.length)) sources[p] = "regex"; });
    return { doc: rx, sources };
  }
  const out = structuredClone(rx) as unknown as Record<string, unknown>;
  const merge = (a: Record<string, unknown>, b: Record<string, unknown>, prefix: string) => {
    for (const k of Object.keys(b)) {
      const path = prefix ? `${prefix}.${k}` : k;
      const av = a[k];
      const bv = b[k];
      if (bv && typeof bv === "object" && !Array.isArray(bv)) {
        a[k] = a[k] ?? {};
        merge(a[k] as Record<string, unknown>, bv as Record<string, unknown>, path);
        continue;
      }
      const aEmpty = av === null || av === undefined || (Array.isArray(av) && av.length === 0) || (k === "formType" && av === "NIEZNANY");
      const bEmpty = bv === null || bv === undefined || (Array.isArray(bv) && bv.length === 0) || (k === "formType" && bv === "NIEZNANY");
      if (aEmpty && !bEmpty) { a[k] = bv; sources[path] = "ai"; }
      else if (!aEmpty && !bEmpty) {
        // identyfikatory: zostaw wartość regex, jeśli ma poprawną sumę kontrolną
        if (k === "pesel" && typeof av === "string" && validatePesel(av).valid) sources[path] = "regex+ai";
        else if (k === "nip" && typeof av === "string" && validateNip(av).valid) sources[path] = "regex+ai";
        else if (k === "signed") { a[k] = Boolean(av) || Boolean(bv); sources[path] = "regex+ai"; }
        else if (Array.isArray(av) && Array.isArray(bv)) { a[k] = bv.length > av.length ? bv : av; sources[path] = "regex+ai"; }
        else { a[k] = bv; sources[path] = av === bv ? "regex+ai" : "ai"; }
      } else if (!aEmpty) sources[path] = "regex";
    }
  };
  merge(out, ai as unknown as Record<string, unknown>, "");
  return { doc: out as unknown as ExtractedDocument, sources };
}

function walk(o: unknown, prefix: string, fn: (p: string, v: unknown) => void) {
  if (o && typeof o === "object" && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) walk(v, prefix ? `${prefix}.${k}` : k, fn);
  else fn(prefix, o);
}

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
