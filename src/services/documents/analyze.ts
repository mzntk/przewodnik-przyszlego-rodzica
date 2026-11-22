/**
 * Potok analizy dokumentu: PDF → tekst (lub AI-vision dla skanów) → parser regułowy (+ mapowanie AI)
 * → walidacja formalna → mapowanie na CaseInput → DETERMINISTYCZNY silnik → werdykt.
 */
import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { LegalConfig } from "@/models/legal-config";
import type { AnalysisResponse, ExtractedDocument, ValidationIssue } from "@/models/document";
import { parseDocumentText } from "./parse";
import { validateDocument, withOkNote } from "./validate";
import { validatePesel, validateNip } from "./identifiers";
import { aiExtract } from "@/services/ai/extract";
import { AI_MODEL } from "@/services/ai/client";
import { evaluateDocument } from "./evaluate";
import { readAcroForm } from "@/lib/official-pdf";
import { detectOfficialForm } from "@/data/official-forms";
import { reviewOfficialForm } from "@/services/forms/review";

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
  const officialForm = detectOfficialForm(Object.keys(formFields));

  let doc: ExtractedDocument;
  let sources: AnalysisResponse["fieldSources"] = {};
  let issues: ValidationIssue[];
  let method: AnalysisResponse["extraction"]["method"];
  let aiDoc: ExtractedDocument | null = null;
  let aiNote: string | undefined;

  if (officialForm) {
    // Edytowalny druk ZUS: dane wyłącznie z pól formularza. Tekst PDF to treść szablonu (etykiety i pouczenia) –
    // parser tekstu ani AI nie mogą go „odczytywać”, bo wzięłyby etykiety za dane (np. imię „Nazwisko”).
    const review = reviewOfficialForm(officialForm, formFields);
    doc = review.document;
    for (const p of review.paths) sources[p] = "pdf";
    issues = review.issues;
    method = "pdf-form";
    aiNote = "Edytowalny druk ZUS – dane odczytano bezpośrednio z pól formularza (bez AI).";
  } else {
    const regexDoc = parseDocumentText(text);
    method = scanned ? "brak-tekstu" : "pdf-text";
    if (opts.useAi) {
      const r = scanned ? await aiExtract({ pdfBase64: Buffer.from(bytes).toString("base64") }) : await aiExtract({ text: text.slice(0, 60000) });
      aiDoc = r.doc;
      aiNote = r.note;
      if (aiDoc && scanned) method = "ai-vision";
    } else {
      aiNote = "Tryb bez AI – parser regułowy.";
    }
    ({ doc, sources } = mergeDocs(regexDoc, aiDoc));
    issues = validateDocument(doc);
    if (scanned && !aiDoc) issues.unshift({ field: "*", severity: "warning", message: "Dokument nie ma warstwy tekstowej (skan). Włącz analizę AI (OCR) lub prześlij PDF z tekstem.", hint: "Edytowalny druk wypełniony w aplikacji (Moje sprawy → wniosek → Podgląd → Pobierz) odczytamy bez AI." });
    issues = withOkNote(issues);
  }

  const { caseInput: input, verdict, base } = evaluateDocument(doc, cfg, opts.asOf);

  return {
    fileName,
    caseInput: input,
    extraction: { method, pages, chars, scanned: officialForm ? false : scanned, aiUsed: !!aiDoc, aiModel: aiDoc ? AI_MODEL : undefined, aiNote, durationMs: Date.now() - t0 },
    document: doc,
    fieldSources: sources,
    issues,
    textPreview: officialForm ? Object.entries(formFields).filter(([, v]) => v !== "" && v !== false).map(([k, v]) => `${k}: ${v === true ? "[X]" : v}`).join("\n").slice(0, 4000) : text.slice(0, 4000),
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
