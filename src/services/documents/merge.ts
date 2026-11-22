/**
 * Scalanie teczki dokumentów jednej sprawy (np. ZAM + Z-3 + poświadczenie ubezpieczenia) w jeden zestaw danych.
 * Każde pole bierzemy z dokumentu, który jest dla niego źródłem „właściwym” (np. wynagrodzenia – z zaświadczenia płatnika,
 * okres ubezpieczenia – z poświadczenia ZUS, dane dziecka – z wniosku). Deterministyczne, bez AI.
 */
import type { ExtractedDocument, FormCode, ValidationIssue } from "@/models/document";
import { FORM_NAMES } from "@/models/document";
import type { InsuranceTitle } from "@/models/types";

type Doc = ExtractedDocument;
const BENEFIT_FORMS: FormCode[] = ["ZAM", "ZAS-53", "Z-15A", "Z-15B", "Z-12", "E-ZLA"];
const PRIORITY = {
  insured: ["ZAM", "POSWIADCZENIE", "ZRZUT-SYSTEMU", "Z-3", "Z-3a", "ZAS-12", "ZAS-53", "Z-15A", "Z-15B", "Z-12", "E-ZLA", "NIEZNANY"],
  payer: ["Z-3", "Z-3a", "ZAS-12", "POSWIADCZENIE", "ZRZUT-SYSTEMU", "ZAM", "ZAS-53", "Z-15A", "Z-15B", "NIEZNANY"],
  insurance: ["POSWIADCZENIE", "ZRZUT-SYSTEMU", "Z-3", "Z-3a", "ZAS-12", "ZAM", "ZAS-53", "NIEZNANY"],
  income: ["Z-3", "Z-3a", "ZAS-12", "POSWIADCZENIE", "ZRZUT-SYSTEMU", "ZAM", "NIEZNANY"],
  child: ["ZAM", "Z-15A", "ZRZUT-SYSTEMU", "Z-3", "Z-3a", "POSWIADCZENIE", "NIEZNANY"],
} satisfies Record<string, FormCode[]>;
const DEFAULT_TITLE: Partial<Record<FormCode, InsuranceTitle>> = { "Z-3": "uop", "ZAS-12": "uop", "Z-3a": "zlecenie", "ZAS-53": "jdg" };

const empty = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** Dokumenty posortowane wg priorytetu dla danej grupy pól (z zachowaniem indeksów). */
function ranked(docs: Doc[], order: readonly FormCode[]) {
  const rank = (f: FormCode) => (order.includes(f) ? order.indexOf(f) : order.length);
  return docs.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d.formType) - rank(b.d.formType) || a.i - b.i);
}

export function mergeDocuments(docs: Doc[]): { document: Doc; fieldFrom: Record<string, number>; issues: ValidationIssue[] } {
  if (docs.length === 1) return { document: docs[0], fieldFrom: {}, issues: [] };
  const fieldFrom: Record<string, number> = {};
  const pick = <T,>(path: string, order: readonly FormCode[], get: (d: Doc) => T): T | null => {
    for (const { d, i } of ranked(docs, order)) {
      const v = get(d);
      if (!empty(v)) {
        fieldFrom[path] = i;
        return v;
      }
    }
    return null;
  };

  const primaryIdx = docs.findIndex((d) => BENEFIT_FORMS.includes(d.formType));
  const primary = docs[primaryIdx >= 0 ? primaryIdx : 0];
  const P = PRIORITY;

  let title = pick("title", P.insurance, (d) => d.title);
  if (!title) {
    const payerDoc = ranked(docs, P.payer).find(({ d }) => DEFAULT_TITLE[d.formType]);
    if (payerDoc) {
      title = DEFAULT_TITLE[payerDoc.d.formType]!;
      fieldFrom.title = payerDoc.i;
    }
  }

  // wynagrodzenia: suma miesięcy ze wszystkich zaświadczeń (pierwszeństwo – zaświadczenie płatnika)
  const months = new Map<string, Doc["incomeMonths"][number]>();
  for (const { d, i } of ranked(docs, P.income))
    for (const m of d.incomeMonths)
      if (!months.has(m.month)) {
        months.set(m.month, m);
        fieldFrom.incomeMonths ??= i;
      }

  const leaves = new Map<string, Doc["sickLeaves"][number]>();
  docs.forEach((d, i) => d.sickLeaves.forEach((l) => (leaves.has(`${l.from}|${l.to}`) ? null : (leaves.set(`${l.from}|${l.to}`, l), (fieldFrom.sickLeaves ??= i)))));

  const ch = <K extends keyof Doc["child"]>(k: K) => pick(`child.${k}`, P.child, (d) => d.child[k]);
  const document: Doc = {
    formType: primary.formType,
    insured: {
      firstName: pick("insured.firstName", P.insured, (d) => d.insured.firstName),
      lastName: pick("insured.lastName", P.insured, (d) => d.insured.lastName),
      pesel: pick("insured.pesel", P.insured, (d) => d.insured.pesel),
      birthDate: pick("insured.birthDate", P.insured, (d) => d.insured.birthDate),
      address: pick("insured.address", P.insured, (d) => d.insured.address),
    },
    payer: {
      name: pick("payer.name", P.payer, (d) => d.payer.name),
      nip: pick("payer.nip", P.payer, (d) => d.payer.nip),
      regon: pick("payer.regon", P.payer, (d) => d.payer.regon),
      insuredCount: pick("payer.insuredCount", P.payer, (d) => d.payer.insuredCount),
    },
    title,
    voluntarySickness: pick("voluntarySickness", P.insurance, (d) => d.voluntarySickness),
    insuranceStart: pick("insuranceStart", P.insurance, (d) => d.insuranceStart),
    insuranceEnd: pick("insuranceEnd", P.insurance, (d) => d.insuranceEnd),
    workTimeFraction: pick("workTimeFraction", P.payer, (d) => d.workTimeFraction),
    incomeMonths: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    declaredBase: pick("declaredBase", P.insurance, (d) => d.declaredBase),
    contributionDebt: pick("contributionDebt", P.insurance, (d) => d.contributionDebt),
    child: {
      firstName: ch("firstName"),
      pesel: ch("pesel"),
      dueDate: ch("dueDate"),
      birthDate: ch("birthDate"),
      childrenCount: ch("childrenCount"),
      zaZyciem: ch("zaZyciem"),
      gestationWeek: ch("gestationWeek"),
      birthWeightG: ch("birthWeightG"),
      hospitalizationDays: ch("hospitalizationDays"),
      adoption: ch("adoption"),
    },
    benefit: primary.benefit,
    sickLeaves: [...leaves.values()].sort((a, b) => a.from.localeCompare(b.from)),
    bankAccount: primary.bankAccount ?? pick("bankAccount", P.insured, (d) => d.bankAccount),
    signed: primary.signed,
    signatureDate: primary.signatureDate,
    decision: pick("decision", P.insurance, (d) => d.decision),
  };

  return { document, fieldFrom, issues: crossCheck(docs) };
}

/** Spójność teczki: czy wszystkie dokumenty dotyczą tej samej osoby i tego samego dziecka. */
function crossCheck(docs: Doc[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const name = (d: Doc) => `${FORM_NAMES[d.formType].split(" – ")[0]}`;
  const distinct = <T,>(get: (d: Doc) => T | null) => {
    const seen = new Map<string, string[]>();
    for (const d of docs) {
      const v = get(d);
      if (v === null || v === undefined || v === "") continue;
      const k = String(v).toLowerCase();
      seen.set(k, [...(seen.get(k) ?? []), name(d)]);
    }
    return seen;
  };
  const pesels = distinct((d) => d.insured.pesel);
  if (pesels.size > 1) issues.push({ field: "insured.pesel", severity: "error", message: `Dokumenty mają różne numery PESEL (${[...pesels].map(([p, f]) => `${p} – ${f.join(", ")}`).join("; ")}). Sprawdź, czy dotyczą tej samej osoby.` });
  const surnames = distinct((d) => d.insured.lastName);
  if (pesels.size <= 1 && surnames.size > 1) issues.push({ field: "insured.lastName", severity: "warning", message: `Różne nazwiska w dokumentach: ${[...surnames.keys()].join(", ")} (np. zmiana nazwiska – dołącz dokument potwierdzający).` });
  const births = distinct((d) => d.child.birthDate);
  if (births.size > 1) issues.push({ field: "child.birthDate", severity: "error", message: `Różne daty urodzenia dziecka: ${[...births.keys()].join(", ")}.` });
  const nips = distinct((d) => d.payer.nip);
  if (nips.size > 1) issues.push({ field: "payer.nip", severity: "info", message: `W teczce jest ${nips.size} płatników składek – przy kilku tytułach ubezpieczenia podstawę liczy się z każdego z nich.` });
  const forms = docs.map((d) => d.formType);
  if (forms.includes("ZAM") && !forms.some((f) => ["Z-3", "Z-3a", "ZAS-12", "POSWIADCZENIE"].includes(f)))
    issues.push({ field: "*", severity: "info", message: "W teczce jest wniosek, ale brak zaświadczenia płatnika (Z-3 / Z-3a) lub poświadczenia ubezpieczenia – kwota będzie przybliżona." });
  return issues;
}
