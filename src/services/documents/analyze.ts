/**
 * Potok analizy dokumentu: PDF → tekst (lub AI-vision dla skanów) → parser regułowy (+ mapowanie AI)
 * → walidacja formalna → mapowanie na CaseInput → DETERMINISTYCZNY silnik → werdykt.
 */
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { LegalConfig } from "@/models/legal-config";
import type { AnalysisResponse, ExtractedDocument } from "@/models/document";
import { parseDocumentText } from "./parse";
import { validateDocument } from "./validate";
import { validatePesel, validateNip } from "./identifiers";
import { aiExtract } from "@/services/ai/extract";
import { AI_MODEL } from "@/services/ai/client";
import { evaluateDocument } from "./evaluate";
import { readAcroForm } from "@/lib/official-pdf";
import { OFFICIAL_TO_FORMCODE, applyFormFields, detectOfficialForm } from "@/data/official-forms";
import { checkForm } from "@/services/forms/check";

export async function extractPdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  return { text: (text as string[]).join("\n\n--- strona ---\n\n"), pages: totalPages };
}

export async function analyzePdf(bytes: Uint8Array, fileName: string, cfg: LegalConfig, opts: { useAi: boolean; asOf: string }): Promise<AnalysisResponse> {
  const t0 = Date.now();
  // najpierw pola formularza (kopia bajtów – pdf.js przejmuje bufor przy odczycie tekstu)
  const formFields = await readAcroForm(bytes.slice());
  let text = "";
  let pages = 0;
  try {
    const r = await extractPdfText(bytes.slice());
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

  // edytowalny druk ZUS: wartości pól są dokładne – mają pierwszeństwo przed odczytem tekstu i AI
  const filledFields = Object.values(formFields).filter((v) => v !== "" && v !== false).length;
  const officialForm = filledFields ? detectOfficialForm(Object.keys(formFields)) : null;
  if (officialForm) {
    doc.formType = OFFICIAL_TO_FORMCODE[officialForm] as ExtractedDocument["formType"];
    for (const path of applyFormFields(doc as unknown as Parameters<typeof applyFormFields>[0], officialForm, formFields)) sources[path] = "pdf";
    if (doc.insured.pesel && !doc.insured.birthDate) doc.insured.birthDate = validatePesel(doc.insured.pesel).birthDate ?? null;
    method = "pdf-form";
  }
  const issues = validateDocument(doc);
  if (officialForm) {
    // formuły sprawdzania druku (services/forms/check): wykluczające się zaznaczenia, zależności, daty, sumy kontrolne NRB/dowodu
    const fc = checkForm(officialForm, formFields);
    for (const i of [...fc.warnings, ...fc.errors].filter((x) => x.rule !== "suma-kontrolna" || /rachunk|dokument/i.test(x.label)))
      issues.unshift({ field: i.field, severity: i.severity, message: i.message, legal: { "wykluczajace": "instrukcja wypełniania druku ZUS", "zaleznosc": "instrukcja wypełniania druku ZUS", "data": "format dd/mm/rrrr", "format": "format pola druku", "suma-kontrolna": "suma kontrolna", "wymagane": "pole wymagane" }[i.rule] });
    const sig = issues.findIndex((i) => i.field === "signed");
    if (sig >= 0) issues[sig] = { ...issues[sig], severity: "warning", message: "Podpisz druk po wydrukowaniu (podpisu nie da się wpisać w pole PDF) albo złóż go przez PUE/eZUS – tam podpisujesz elektronicznie." };
  }
  if (scanned && !aiDoc) issues.unshift({ field: "*", severity: "warning", message: "Dokument nie ma warstwy tekstowej (skan). Włącz analizę AI (OCR) lub prześlij PDF z tekstem." });

  const { caseInput: input, verdict, base } = evaluateDocument(doc, cfg, opts.asOf);
  if (!doc.incomeMonths.length && !doc.declaredBase && verdict.insured) {
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
    officialForm,
    formFields: officialForm ? formFields : undefined,
    verdict,
    base,
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
