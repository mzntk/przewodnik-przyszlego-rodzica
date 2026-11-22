/**
 * KONWERTER PDF → JSON: edytowalny druk ZUS → lista pól z etykietami + ustandaryzowany dokument (models/document).
 * Używany przez „Sprawdź dokument” (potok 2) i REST: POST /api/forms/convert.
 */
import { OFFICIAL_FIELDS, OFFICIAL_FORMS, OFFICIAL_TO_FORMCODE, applyFormFields, detectOfficialForm, type FieldValue, type OfficialFormId } from "@/data/official-forms";
import type { ExtractedDocument } from "@/models/document";
import { parseDocumentText } from "@/services/documents/parse";
import { validatePesel } from "@/services/documents/identifiers";
import { readAcroForm } from "@/lib/official-pdf";

export interface FormJsonField {
  name: string;
  label: string;
  section: string;
  type: "text" | "check";
  value: FieldValue;
}

export interface FormJson {
  form: OfficialFormId | null;
  code: string | null;
  title: string | null;
  zusUrl: string | null;
  /** pola opisane w aplikacji (etykieta, sekcja) */
  fields: FormJsonField[];
  /** pozostałe pola druku (np. komórki tabel) – surowe wartości */
  other: Record<string, FieldValue>;
  /** ustandaryzowany dokument – wejście do silnika uprawnień */
  document: ExtractedDocument;
  /** ścieżki pól dokumentu uzupełnionych z pól druku */
  paths: string[];
}

/** Druk (wartości pól) → JSON. Bez pól AcroForm zwraca form = null i pusty dokument. */
export function valuesToJson(values: Record<string, FieldValue>, form = detectOfficialForm(Object.keys(values))): FormJson {
  const doc = parseDocumentText("");
  const defs = form ? (OFFICIAL_FIELDS[form] ?? []).filter((f) => !f.name.startsWith("@")) : [];
  const known = new Set(defs.map((f) => f.name));
  let paths: string[] = [];
  if (form) {
    doc.formType = OFFICIAL_TO_FORMCODE[form] as ExtractedDocument["formType"];
    paths = applyFormFields(doc as unknown as Parameters<typeof applyFormFields>[0], form, values);
    if (doc.insured.pesel) doc.insured.birthDate = validatePesel(doc.insured.pesel).birthDate ?? null;
  }
  const meta = form ? OFFICIAL_FORMS[form] : null;
  return {
    form,
    code: meta?.code ?? null,
    title: meta?.title ?? null,
    zusUrl: meta?.zusUrl ?? null,
    fields: defs.map((f) => ({ name: f.name, label: f.label, section: f.section, type: f.check ? "check" : "text", value: values[f.name] ?? (f.check ? false : "") })),
    other: Object.fromEntries(Object.entries(values).filter(([k, v]) => !known.has(k) && v !== "" && v !== false)),
    document: doc,
    paths,
  };
}

export async function pdfToJson(bytes: Uint8Array): Promise<FormJson> {
  return valuesToJson(await readAcroForm(bytes));
}
