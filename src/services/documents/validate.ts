/**
 * Walidator braków formalnych wg Załączników 1–7 do rozporządzenia MRPiPS z 27.09.2026
 * (Dz.U. z 2026 r. poz. 1316). Deterministyczny.
 */
import type { ExtractedDocument, ValidationIssue } from "@/models/document";
import { validateNip, validatePesel, validateRegon } from "./identifiers";

type Rule = { field: string; check: (d: ExtractedDocument) => boolean; message: string; legal: string; severity?: ValidationIssue["severity"] };

const insuredRules = (zal: string): Rule[] => [
  { field: "insured.firstName", check: (d) => !!d.insured.firstName, message: "Brak pierwszego imienia ubezpieczonego", legal: `${zal} pkt 1/3` },
  { field: "insured.lastName", check: (d) => !!d.insured.lastName, message: "Brak nazwiska ubezpieczonego", legal: `${zal} pkt 1/3` },
  { field: "insured.pesel", check: (d) => !!d.insured.pesel, message: "Brak numeru PESEL ubezpieczonego", legal: `${zal} pkt 1/3` },
];
const payerRules = (zal: string): Rule[] => [
  { field: "payer.nip", check: (d) => !!d.payer.nip, message: "Brak NIP płatnika składek", legal: `${zal} pkt 1` },
  { field: "payer.regon", check: (d) => !!d.payer.regon, message: "Brak REGON płatnika składek", legal: `${zal} pkt 1`, severity: "warning" },
  { field: "payer.name", check: (d) => !!d.payer.name, message: "Brak nazwy płatnika składek", legal: `${zal} pkt 2` },
];
const signature = (zal: string, pkt: string): Rule => ({ field: "signed", check: (d) => d.signed, message: "Brak podpisu na dokumencie", legal: `${zal} pkt ${pkt}` });
const bank = (zal: string, pkt: string): Rule => ({ field: "bankAccount", check: (d) => !!d.bankAccount, message: "Brak numeru rachunku bankowego", legal: `${zal} pkt ${pkt}`, severity: "warning" });

const RULES: Partial<Record<ExtractedDocument["formType"], Rule[]>> = {
  ZAM: [
    ...insuredRules("Zał. 6"),
    { field: "child", check: (d) => !!(d.child.dueDate || d.child.birthDate || d.child.pesel), message: "Brak danych dziecka (data urodzenia / przewidywana data porodu / PESEL dziecka)", legal: "Zał. 6 pkt 5 i 10" },
    { field: "benefit.type", check: (d) => !!(d.benefit.type || d.benefit.from), message: "Nie wskazano rodzaju świadczenia lub okresu", legal: "Zał. 6 pkt 7" },
    { field: "child.zaZyciem", check: (d) => d.child.zaZyciem !== null, message: "Brak oświadczenia o zaświadczeniu „Za życiem”", legal: "Zał. 6 pkt 9", severity: "warning" },
    bank("Zał. 6", "17"),
    signature("Zał. 6", "18"),
  ],
  "Z-3": [
    ...payerRules("Zał. 2"),
    ...insuredRules("Zał. 2"),
    { field: "insuranceStart", check: (d) => !!d.insuranceStart, message: "Brak okresu zatrudnienia u płatnika", legal: "Zał. 2 pkt 4" },
    { field: "workTimeFraction", check: (d) => d.workTimeFraction !== null, message: "Brak wymiaru czasu pracy", legal: "Zał. 2 pkt 4", severity: "warning" },
    { field: "payer.insuredCount", check: (d) => d.payer.insuredCount !== null, message: "Brak liczby ubezpieczonych zgłaszanych do ubezpieczenia chorobowego", legal: "Zał. 2 pkt 11" },
    { field: "incomeMonths", check: (d) => d.incomeMonths.length > 0, message: "Brak składników wynagrodzenia za poszczególne miesiące", legal: "Zał. 2 pkt 16" },
    { field: "incomeMonths.days", check: (d) => d.incomeMonths.length === 0 || d.incomeMonths.every((m) => m.workedDays !== null), message: "Brak liczby dni przepracowanych/obowiązujących przy wynagrodzeniach", legal: "Zał. 2 pkt 16", severity: "warning" },
    signature("Zał. 2", "18"),
  ],
  "Z-3a": [
    ...payerRules("Zał. 3"),
    ...insuredRules("Zał. 3"),
    { field: "insuranceStart", check: (d) => !!d.insuranceStart, message: "Brak okresów podlegania ubezpieczeniu chorobowemu", legal: "Zał. 3 pkt 5" },
    { field: "payer.insuredCount", check: (d) => d.payer.insuredCount !== null, message: "Brak liczby ubezpieczonych", legal: "Zał. 3 pkt 12" },
    { field: "incomeMonths", check: (d) => d.incomeMonths.length > 0, message: "Brak przychodu stanowiącego podstawę wymiaru składek za miesiące", legal: "Zał. 3 pkt 14" },
    signature("Zał. 3", "15"),
  ],
  "ZAS-53": [
    ...insuredRules("Zał. 1"),
    { field: "sickLeaves", check: (d) => d.sickLeaves.length > 0 || !!d.benefit.from, message: "Nie wskazano okresu i serii/numeru zaświadczenia lekarskiego", legal: "Zał. 1 pkt 4" },
    bank("Zał. 1", "8"),
    signature("Zał. 1", "9"),
  ],
  "Z-15A": [...insuredRules("Zał. 7"), { field: "child", check: (d) => !!(d.child.pesel || d.child.firstName), message: "Brak danych dziecka", legal: "Zał. 7 pkt 3" }, bank("Zał. 7", "7"), signature("Zał. 7", "8")],
  "Z-15B": [...insuredRules("Zał. 7"), bank("Zał. 7", "7"), signature("Zał. 7", "8")],
  POSWIADCZENIE: [...insuredRules("Poświadczenie"), { field: "insuranceStart", check: (d) => !!d.insuranceStart, message: "Brak okresu podlegania ubezpieczeniu chorobowemu", legal: "art. 29 ustawy zasiłkowej" }],
};

export function validateDocument(d: ExtractedDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const r of RULES[d.formType] ?? []) {
    if (!r.check(d)) issues.push({ field: r.field, severity: r.severity ?? "error", message: r.message, legal: `${r.legal} rozp. z 27.09.2026` });
  }
  // sumy kontrolne
  if (d.insured.pesel) {
    const v = validatePesel(d.insured.pesel);
    if (!v.valid) issues.push({ field: "insured.pesel", severity: "error", message: `PESEL ubezpieczonego: ${v.error}`, legal: "ustawa o ewidencji ludności, art. 15" });
  }
  if (d.child.pesel) {
    const v = validatePesel(d.child.pesel);
    if (!v.valid) issues.push({ field: "child.pesel", severity: "error", message: `PESEL dziecka: ${v.error}` });
  }
  if (d.payer.nip) {
    const v = validateNip(d.payer.nip);
    if (!v.valid) issues.push({ field: "payer.nip", severity: "error", message: `NIP płatnika: ${v.error}` });
  }
  if (d.payer.regon) {
    const v = validateRegon(d.payer.regon);
    if (!v.valid) issues.push({ field: "payer.regon", severity: "warning", message: `REGON: ${v.error}` });
  }
  if (d.bankAccount && !/^(PL)?\d{26}$/.test(d.bankAccount)) issues.push({ field: "bankAccount", severity: "warning", message: "Numer rachunku nie ma 26 cyfr (NRB)" });
  // spójność
  if (d.insured.pesel && d.insured.birthDate && d.child.birthDate && d.child.birthDate < d.insured.birthDate) issues.push({ field: "child.birthDate", severity: "error", message: "Data urodzenia dziecka wcześniejsza niż ubezpieczonego" });
  for (const l of d.sickLeaves) if (l.from > l.to) issues.push({ field: "sickLeaves", severity: "error", message: `Zwolnienie ${l.series ?? ""}: data „od” po dacie „do”` });
  if (d.formType === "NIEZNANY") issues.push({ field: "formType", severity: "warning", message: "Nie rozpoznano symbolu druku – sprawdź, czy to aktualny formularz (ZUR, ZAO i Z-3b zlikwidowano 24.10.2026)." });
  if (/\b(ZUR|ZAO|Z-3b)\b/.test(d.decision ?? "")) issues.push({ field: "formType", severity: "warning", message: "Dokument odwołuje się do zlikwidowanego druku (ZUR/ZAO/Z-3b). Od 24.10.2026 r. używaj ZAM." });
  if (issues.length === 0) issues.push({ field: "*", severity: "info", message: "Nie wykryto braków formalnych w zakresie wymaganym przez rozporządzenie." });
  return issues;
}
