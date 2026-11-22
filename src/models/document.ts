import { z } from "zod";

/** Ustandaryzowany JSON dokumentu – wspólny dla parsera regułowego i mapowania AI (Structured Output). */
export const FORM_CODES = ["ZAM", "Z-3", "Z-3a", "ZAS-12", "ZAS-53", "Z-15A", "Z-15B", "Z-12", "ZCNA", "POSWIADCZENIE", "E-ZLA", "ZRZUT-SYSTEMU", "NIEZNANY"] as const;
export type FormCode = (typeof FORM_CODES)[number];

export const FORM_NAMES: Record<FormCode, string> = {
  ZAM: "ZAM – Wniosek o zasiłek macierzyński",
  "Z-3": "Z-3 – Zaświadczenie płatnika składek (pracownik)",
  "Z-3a": "Z-3a – Zaświadczenie płatnika składek (niepracownik)",
  "ZAS-12": "ZAS-12 – Zaświadczenie płatnika na dalszy okres",
  "ZAS-53": "ZAS-53 – Wniosek o zasiłek chorobowy",
  "Z-15A": "Z-15 – Wniosek o zasiłek opiekuńczy",
  "Z-15B": "Z-15B – Wniosek o zasiłek opiekuńczy (członek rodziny)",
  "Z-12": "Z-12 – Wniosek o zasiłek pogrzebowy",
  ZCNA: "ZUS ZCNA – Zgłoszenie członka rodziny do ubezpieczenia zdrowotnego",
  POSWIADCZENIE: "Poświadczenie ubezpieczenia chorobowego (ZUS)",
  "E-ZLA": "Zaświadczenie lekarskie e-ZLA",
  "ZRZUT-SYSTEMU": "Zrzut z systemu ZUS",
  NIEZNANY: "Nierozpoznany dokument",
};

const nullableStr = z.string().nullable();
const nullableNum = z.number().nullable();
const nullableBool = z.boolean().nullable();

export const ExtractedDocumentSchema = z.object({
  formType: z.enum(FORM_CODES),
  insured: z.object({
    firstName: nullableStr,
    lastName: nullableStr,
    pesel: nullableStr,
    birthDate: nullableStr.describe("RRRR-MM-DD"),
    address: nullableStr,
  }),
  payer: z.object({
    name: nullableStr,
    nip: nullableStr,
    regon: nullableStr,
    insuredCount: nullableNum.describe("liczba ubezpieczonych zgłaszanych do ubezpieczenia chorobowego"),
  }),
  title: z.enum(["uop", "zlecenie", "jdg", "jdg_preferencyjna", "maly_zus_plus", "ulga_na_start", "nierejestrowa", "student_zlecenie", "brak"]).nullable(),
  voluntarySickness: nullableBool,
  insuranceStart: nullableStr.describe("RRRR-MM-DD – początek nieprzerwanego ubezpieczenia chorobowego"),
  insuranceEnd: nullableStr,
  workTimeFraction: nullableNum.describe("wymiar etatu, np. 1 lub 0.5"),
  incomeMonths: z.array(
    z.object({
      month: z.string().describe("RRRR-MM"),
      gross: z.number(),
      workedDays: nullableNum,
      requiredDays: nullableNum,
    }),
  ),
  declaredBase: nullableNum,
  contributionDebt: nullableNum,
  child: z.object({
    firstName: nullableStr,
    pesel: nullableStr,
    dueDate: nullableStr,
    birthDate: nullableStr,
    childrenCount: nullableNum,
    zaZyciem: nullableBool,
    gestationWeek: nullableNum,
    birthWeightG: nullableNum,
    hospitalizationDays: nullableNum,
    adoption: nullableBool,
  }),
  benefit: z.object({
    type: nullableStr.describe("np. macierzyński, rodzicielski, chorobowy, opiekuńczy"),
    from: nullableStr,
    to: nullableStr,
    variant815: nullableBool,
  }),
  sickLeaves: z.array(z.object({ series: nullableStr, from: z.string(), to: z.string(), codeB: z.boolean() })),
  bankAccount: nullableStr,
  signed: z.boolean(),
  signatureDate: nullableStr,
  decision: nullableStr.describe("treść rozstrzygnięcia, jeśli dokument je zawiera (np. przyznano/odmówiono)"),
});

export type ExtractedDocument = z.infer<typeof ExtractedDocumentSchema>;

export interface ValidationIssue {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  legal?: string;
}

export interface AnalysisResponse {
  fileName: string;
  caseInput: import("./types").CaseInput;
  extraction: {
    method: "pdf-text" | "ai-vision" | "brak-tekstu" | "pdf-form";
    pages: number;
    chars: number;
    scanned: boolean;
    aiUsed: boolean;
    aiModel?: string;
    aiNote?: string;
    durationMs: number;
  };
  document: ExtractedDocument;
  fieldSources: Record<string, "regex" | "ai" | "regex+ai" | "pdf">;
  /** Edytowalny druk ZUS: rozpoznany formularz i wartości jego pól (potok 2 – porównanie z danymi aplikacji) */
  officialForm?: import("@/data/official-forms").OfficialFormId | null;
  formFields?: Record<string, string | boolean>;
  issues: ValidationIssue[];
  textPreview: string;
  verdict: Verdict;
  /** Sposób wyliczenia podstawy (krok po kroku) */
  base: import("./types").BaseCalculation;
}

export interface Verdict {
  insured: boolean;
  insuredLabel: string;
  legalBasis: string;
  payer: string;
  payerReason: string;
  benefitLabel: string;
  monthly: number;
  dailyBase: number;
  base: number;
  rateLabel: string;
  periodFrom: string | null;
  periodTo: string | null;
  totalWeeks: number;
  total: number;
  blockedByDebt: boolean;
  segments: { label: string; from: string; to: string; weeks: number; rate: number; monthly: number; total: number }[];
}

/** Ocena całej sprawy (teczki dokumentów) – po scaleniu lub po ręcznej korekcie pól. */
export interface CaseEvaluation {
  document: ExtractedDocument;
  /** pole → indeks dokumentu w teczce, z którego pochodzi wartość */
  fieldFrom: Record<string, number>;
  caseInput: import("./types").CaseInput;
  verdict: Verdict;
  base: import("./types").BaseCalculation;
  issues: ValidationIssue[];
}
