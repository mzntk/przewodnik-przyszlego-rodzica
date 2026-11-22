/**
 * Walidator braków formalnych wg Załączników 1–7 do rozporządzenia MRPiPS z 27.09.2026
 * (Dz.U. z 2026 r. poz. 1316). Deterministyczny.
 */
import type { ExtractedDocument, ValidationIssue } from "@/models/document";
import { validateNip, validatePesel, validateRegon } from "./identifiers";

type Rule = { field: string; check: (d: ExtractedDocument) => boolean; message: string; legal: string; severity?: ValidationIssue["severity"]; hint?: string };

/** Skąd wziąć brakującą informację – wspólne dla wszystkich druków (klucz = ścieżka pola dokumentu). */
export const FIELD_HINTS: Record<string, string> = {
  "insured.firstName": "Dowód osobisty lub mObywatel (w aplikacji: Ustawienia → Twoje dane).",
  "insured.lastName": "Dowód osobisty lub mObywatel (w aplikacji: Ustawienia → Twoje dane).",
  "insured.pesel": "Dowód osobisty lub mObywatel – 11 cyfr.",
  "payer.nip": "Od pracodawcy / zleceniodawcy (umowa, pasek wynagrodzenia) albo PUE/eZUS → Dane o płatnikach. Przy własnej firmie – CEIDG.",
  "payer.regon": "Wyszukiwarka REGON GUS (wyszukiwarkaregon.stat.gov.pl) albo umowa z płatnikiem.",
  "payer.name": "Umowa o pracę / zlecenia albo pasek wynagrodzenia. Przy własnej firmie – nazwa z CEIDG.",
  "payer.insuredCount": "Kadry lub księgowość płatnika: ile osób zgłoszono do ubezpieczenia chorobowego (stan na 30 listopada poprzedniego roku). Do 20 – zasiłek wypłaca ZUS, powyżej – pracodawca.",
  insuranceStart: "Umowa albo PUE/eZUS → Dane o ubezpieczeniach (data zgłoszenia ZUA).",
  workTimeFraction: "Umowa o pracę (wymiar etatu).",
  incomeMonths: "Listy płac z 12 miesięcy przed porodem – wpisuje płatnik (kadry). Kwoty brutto znajdziesz też na paskach wynagrodzenia i w PIT-11.",
  "incomeMonths.days": "Ewidencja czasu pracy – wpisuje płatnik (kadry).",
  child: "Przed porodem: zaświadczenie lekarskie o przewidywanej dacie porodu. Po porodzie: odpis aktu urodzenia albo mObywatel → dane dziecka (PESEL nadaje USC przy rejestracji urodzenia).",
  "child.pesel": "PESEL dziecka nadaje USC przy rejestracji urodzenia – znajdziesz go w mObywatelu lub na odpisie aktu urodzenia.",
  "child.zaZyciem": "Zaznacz tylko, jeśli dziecko ma zaświadczenie lekarskie „Za życiem” (art. 4 ust. 3 ustawy o wspieraniu kobiet w ciąży i rodzin).",
  "benefit.type": "Zaznacz rodzaj urlopu (macierzyński, rodzicielski, ojcowski…) i wpisz okres – terminy podpowie Kalkulator → Urlopy.",
  bankAccount: "Bankowość elektroniczna – numer rachunku (26 cyfr). Bez niego ZUS wyśle pieniądze przekazem pocztowym.",
  signed: "Podpisz druk odręcznie po wydrukowaniu albo złóż go przez PUE/eZUS – tam podpisujesz elektronicznie (profil zaufany, e-dowód).",
  sickLeaves: "PUE/eZUS → Zaświadczenia lekarskie (e-ZLA): okres i seria/numer zwolnienia.",
  formType: "Aktualne druki pobierzesz z zus.pl (Wzory formularzy → Zasiłki) albo wypełnione z aplikacji: Moje sprawy → wybrany wniosek → Podgląd wniosku.",
};

/** „Zał. 6 pkt 3” dla załączników rozporządzenia; dla druków KEDU (ZCNA, ZUA) – sam opis bloku */
const at = (zal: string, pkt: string) => (zal.startsWith("Zał.") ? `${zal} pkt ${pkt}` : zal);
const insuredRules = (zal: string): Rule[] => [
  { field: "insured.firstName", check: (d) => !!d.insured.firstName, message: "Brak pierwszego imienia ubezpieczonego", legal: at(zal, "1/3") },
  { field: "insured.lastName", check: (d) => !!d.insured.lastName, message: "Brak nazwiska ubezpieczonego", legal: at(zal, "1/3") },
  { field: "insured.pesel", check: (d) => !!d.insured.pesel, message: "Brak numeru PESEL ubezpieczonego", legal: at(zal, "1/3") },
];
const payerRules = (zal: string): Rule[] => [
  { field: "payer.nip", check: (d) => !!d.payer.nip, message: "Brak NIP płatnika składek", legal: at(zal, "1") },
  { field: "payer.regon", check: (d) => !!d.payer.regon, message: "Brak REGON płatnika składek", legal: at(zal, "1"), severity: "warning" },
  { field: "payer.name", check: (d) => !!d.payer.name, message: "Brak nazwy płatnika składek", legal: at(zal, "2") },
];
const signature = (zal: string, pkt: string): Rule => ({ field: "signed", check: (d) => d.signed, message: "Brak podpisu na dokumencie", legal: at(zal, pkt) });
const bank = (zal: string, pkt: string): Rule => ({ field: "bankAccount", check: (d) => !!d.bankAccount, message: "Brak numeru rachunku bankowego", legal: at(zal, pkt), severity: "warning" });

const RULES: Partial<Record<ExtractedDocument["formType"], Rule[]>> = {
  ZAM: [
    ...insuredRules("Zał. 6"),
    { field: "child", check: (d) => !!(d.child.dueDate || d.child.birthDate || d.child.pesel), message: "Brak danych dziecka (data urodzenia / przyjęcia na wychowanie albo przewidywana data porodu)", legal: "Zał. 6 pkt 5 i 10" },
    { field: "benefit.type", check: (d) => !!(d.benefit.type || d.benefit.from), message: "Nie wskazano rodzaju świadczenia lub okresu", legal: "Zał. 6 pkt 7" },
    { field: "child.zaZyciem", check: (d) => d.child.zaZyciem !== null || (!d.child.birthDate && !d.child.adoption), message: "Brak oświadczenia o zaświadczeniu „Za życiem”", legal: "Zał. 6 pkt 9", severity: "warning" },
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
  "Z-15A": [...insuredRules("Zał. 7"), { field: "child.pesel", check: (d) => !!(d.child.pesel || d.child.birthDate), message: "Brak PESEL (albo daty urodzenia) dziecka, nad którym sprawujesz opiekę", legal: "Zał. 7 pkt 3" }, { field: "child.firstName", check: (d) => !!d.child.firstName, message: "Brak imienia dziecka, nad którym sprawujesz opiekę", legal: "Zał. 7 pkt 3" }, bank("Zał. 7", "7"), signature("Zał. 7", "8")],
  "Z-15B": [...insuredRules("Zał. 7"), bank("Zał. 7", "7"), signature("Zał. 7", "8")],
  ZCNA: [
    ...payerRules("ZUS ZCNA blok II"),
    ...insuredRules("ZUS ZCNA blok III"),
    // przed porodem: jedna uwaga zamiast trzech błędów – ZCNA składa się dopiero po nadaniu dziecku PESEL
    { field: "child", check: (d) => !!(d.child.birthDate || d.child.pesel || d.child.firstName), message: "Brak danych dziecka – zgłoszenie ZCNA złożysz (albo przekażesz płatnikowi) w ciągu 7 dni od nadania dziecku PESEL, po rejestracji urodzenia w USC", legal: "art. 75 ustawy o świadczeniach opieki zdrowotnej", severity: "warning", hint: "PESEL, imię i datę urodzenia dziecka znajdziesz w mObywatelu lub na odpisie aktu urodzenia – w aplikacji wpisz je w Ustawienia → Dziecko, a druk wypełni się sam." },
    { field: "child.pesel", check: (d) => !(d.child.birthDate || d.child.firstName) || !!d.child.pesel, message: "Brak PESEL dziecka", legal: "ZUS ZCNA blok IV pole 03" },
    { field: "child.firstName", check: (d) => !(d.child.birthDate || d.child.pesel) || !!d.child.firstName, message: "Brak imienia dziecka", legal: "ZUS ZCNA blok IV pole 08" },
    { field: "child.birthDate", check: (d) => !(d.child.pesel || d.child.firstName) || !!d.child.birthDate, message: "Brak daty urodzenia dziecka", legal: "ZUS ZCNA blok IV pole 09" },
  ],
  ZUA: [
    ...payerRules("ZUS ZUA blok II").filter((r) => r.field !== "payer.regon"),
    ...insuredRules("ZUS ZUA blok III"),
    { field: "title", check: (d) => !!d.title, message: "Brak kodu tytułu ubezpieczenia", legal: "ZUS ZUA blok V" },
    { field: "insuranceStart", check: (d) => !!d.insuranceStart, message: "Brak daty powstania obowiązku ubezpieczeń", legal: "ZUS ZUA blok VI" },
  ],
  "Z-12": [...insuredRules("Z-12"), signature("Z-12", "oświadczenie")],
  POSWIADCZENIE: [...insuredRules("Poświadczenie"), { field: "insuranceStart", check: (d) => !!d.insuranceStart, message: "Brak okresu podlegania ubezpieczeniu chorobowemu", legal: "art. 29 ustawy zasiłkowej" }],
};

export function validateDocument(d: ExtractedDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const r of RULES[d.formType] ?? []) {
    if (!r.check(d)) issues.push({ field: r.field, severity: r.severity ?? "error", message: r.message, legal: /^Zał\./.test(r.legal) ? `${r.legal} rozp. z 27.09.2026` : r.legal, hint: r.hint ?? FIELD_HINTS[r.field] });
  }
  // sumy kontrolne
  if (d.insured.pesel) {
    const v = validatePesel(d.insured.pesel);
    if (!v.valid) issues.push({ field: "insured.pesel", severity: "error", message: `PESEL ubezpieczonego: ${v.error}`, legal: "ustawa o ewidencji ludności, art. 15", hint: FIELD_HINTS["insured.pesel"] });
  }
  if (d.child.pesel) {
    const v = validatePesel(d.child.pesel);
    if (!v.valid) issues.push({ field: "child.pesel", severity: "error", message: `PESEL dziecka: ${v.error}`, hint: FIELD_HINTS["child.pesel"] });
  }
  if (d.payer.nip) {
    const v = validateNip(d.payer.nip);
    if (!v.valid) issues.push({ field: "payer.nip", severity: "error", message: `NIP płatnika: ${v.error}`, hint: FIELD_HINTS["payer.nip"] });
  }
  if (d.payer.regon) {
    const v = validateRegon(d.payer.regon);
    if (!v.valid) issues.push({ field: "payer.regon", severity: "warning", message: `REGON: ${v.error}`, hint: FIELD_HINTS["payer.regon"] });
  }
  if (d.bankAccount && !/^(PL)?\d{26}$/.test(d.bankAccount)) issues.push({ field: "bankAccount", severity: "warning", message: "Numer rachunku nie ma 26 cyfr (NRB)" });
  // spójność
  if (d.insured.pesel && d.insured.birthDate && d.child.birthDate && d.child.birthDate < d.insured.birthDate) issues.push({ field: "child.birthDate", severity: "error", message: "Data urodzenia dziecka wcześniejsza niż ubezpieczonego" });
  for (const l of d.sickLeaves) if (l.from > l.to) issues.push({ field: "sickLeaves", severity: "error", message: `Zwolnienie ${l.series ?? ""}: data „od” po dacie „do”` });
  if (d.formType === "NIEZNANY") issues.push({ field: "formType", severity: "warning", message: "Nie rozpoznano symbolu druku – sprawdź, czy to aktualny formularz (ZUR, ZAO i Z-3b zlikwidowano 24.10.2026).", hint: FIELD_HINTS.formType });
  if (/\b(ZUR|ZAO|Z-3b)\b/.test(d.decision ?? "")) issues.push({ field: "formType", severity: "warning", message: "Dokument odwołuje się do zlikwidowanego druku (ZUR/ZAO/Z-3b). Od 24.10.2026 r. używaj ZAM.", hint: FIELD_HINTS.formType });
  return issues;
}

/** Komunikat „bez braków”, gdy na liście nie ma błędów ani uwag (dodawany na końcu, po wszystkich regułach). */
export function withOkNote(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.some((i) => i.severity !== "info") ? issues : [...issues, { field: "*", severity: "info", message: "Nie wykryto braków formalnych w zakresie wymaganym przez rozporządzenie." }];
}
