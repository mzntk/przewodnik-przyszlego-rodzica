/**
 * PRZEGLĄD WYPEŁNIONEGO DRUKU ZUS (potok 2 – „Sprawdź dokument”), deterministyczny, bez AI:
 *  wartości pól AcroForm → ustandaryzowany dokument → braki formalne (rozporządzenie) + formuły sprawdzania druku.
 * Przy edytowalnym druku dane bierzemy WYŁĄCZNIE z pól – tekst PDF to treść szablonu (etykiety, pouczenia),
 * więc parser tekstu i AI odczytałyby z niego etykiety zamiast danych.
 */
import { OFFICIAL_FIELDS, OFFICIAL_FORMS, blankValue, fieldSource, type FieldValue, type OfficialFormId } from "@/data/official-forms";
import type { ExtractedDocument, ValidationIssue } from "@/models/document";
import { FIELD_HINTS, validateDocument, withOkNote } from "@/services/documents/validate";
import { checkForm } from "./check";
import { valuesToJson } from "./convert";

const RULE_LEGAL: Record<string, string> = {
  wykluczajace: "instrukcja wypełniania druku ZUS",
  zaleznosc: "instrukcja wypełniania druku ZUS",
  data: "format dd/mm/rrrr",
  format: "format pola druku",
  "suma-kontrolna": "suma kontrolna",
  wymagane: "pole wymagane",
};
/** Pola, których sumę kontrolną sprawdza już walidator dokumentu (nie dublujemy komunikatu). */
const VALIDATED_READS = new Set(["pesel", "nip", "regon", "childPesel"]);

export interface FormReview {
  document: ExtractedDocument;
  issues: ValidationIssue[];
  /** ścieżki pól dokumentu odczytanych z pól druku */
  paths: string[];
  /** liczba wypełnionych pól druku */
  filled: number;
}

export function reviewOfficialForm(form: OfficialFormId, values: Record<string, FieldValue>): FormReview {
  const json = valuesToJson(values, form);
  const doc = json.document;
  const defs = OFFICIAL_FIELDS[form] ?? [];
  const filled = Object.values(values).filter((v) => !blankValue(v)).length;
  const meta = OFFICIAL_FORMS[form];

  // podpisu nie da się wpisać w pole PDF – to wskazówka, nie brak w danych
  const issues: ValidationIssue[] = validateDocument(doc).map((i) =>
    i.field === "signed" ? { ...i, severity: "info", message: "Podpisz druk po wydrukowaniu – podpisu nie wpisuje się w pole PDF." } : i,
  );

  const fc = checkForm(form, values);
  const formIssues: ValidationIssue[] = [...fc.errors, ...fc.warnings]
    .filter((i) => i.rule !== "suma-kontrolna" || !VALIDATED_READS.has(defs.find((f) => f.name === i.field)?.read ?? ""))
    .map((i) => {
      const def = defs.find((f) => f.name === i.field);
      return { field: i.field, severity: i.severity, message: i.message, legal: RULE_LEGAL[i.rule], hint: def ? fieldSource(form, def) : undefined };
    });

  if (!filled) issues.unshift({ field: "*", severity: "error", message: `Druk ${meta.code} jest pusty – nie wpisano żadnych danych.`, hint: FIELD_HINTS.formType });
  if (meta.filledBy === "płatnik") issues.push({ field: "*", severity: "info", message: `Druk ${meta.code} wypełnia i podpisuje płatnik składek (pracodawca / zleceniodawca) – braki w jego części uzupełnia płatnik.` });

  return { document: doc, issues: withOkNote([...formIssues, ...issues]), paths: json.paths, filled };
}
