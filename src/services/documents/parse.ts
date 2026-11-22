/**
 * Deterministyczny parser tekstu dokumentów ZUS (regex + słowniki).
 * Działa bez AI; AI (opcjonalnie) uzupełnia pola, których parser nie znalazł.
 */
import type { ExtractedDocument, FormCode } from "@/models/document";
import { validateNip, validatePesel } from "./identifiers";

const MONTHS: Record<string, string> = {
  styczeń: "01", stycznia: "01", luty: "02", lutego: "02", marzec: "03", marca: "03", kwiecień: "04", kwietnia: "04", maj: "05", maja: "05", czerwiec: "06", czerwca: "06",
  lipiec: "07", lipca: "07", sierpień: "08", sierpnia: "08", wrzesień: "09", września: "09", październik: "10", października: "10", listopad: "11", listopada: "11", grudzień: "12", grudnia: "12",
};

export function normalizeDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[-./](\d{1,2})[-./](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)\s+(\d{4})/i);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  // druki ZUS z kratkami: DDMMRRRR (np. „15012027” po sklejeniu kratek)
  m = s.match(/^(\d{2})\s?(\d{2})\s?((?:19|20)\d{2})$/);
  if (m) {
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(`${iso}T00:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().startsWith(iso)) return iso;
  }
  return null;
}

export function parseAmount(raw: string): number {
  return Number(raw.replace(/\s| /g, "").replace(/zł/i, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
}

const DATE = String.raw`(\d{1,2}[-./]\d{1,2}[-./]\d{4}|\d{4}[-./]\d{1,2}[-./]\d{1,2}|(?<!\d)[0-3]\d[01]\d(?:19|20)\d{2}(?!\d))`;

/**
 * Ujednolicenie tekstu z oficjalnych druków ZUS: cyfry wpisane w kratki („8 5 0 1 0 1 …”, „8|5|0|1…”)
 * sklejamy w jeden numer (PESEL, NIP, REGON, NRB, daty DDMMRRRR), a znaki X w polach wyboru zamieniamy na [x].
 */
export function normalizeFormText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/(?<![\d,])\d(?:[ \u00a0|]{1,2}\d){7,27}(?![\d,])/g, (m) => m.replace(/[ \u00a0|]/g, ""))
    .replace(/[ \t]+/g, " ");
}
const AMOUNT = String.raw`(\d{1,3}(?:[  .]?\d{3})*(?:,\d{2})?)`;

function find(text: string, re: RegExp): string | null {
  const m = text.match(re);
  return m ? (m[1] ?? m[0]).trim() : null;
}

export function detectFormType(text: string): FormCode {
  const t = text.toUpperCase();
  const head = t.slice(0, 1500);
  if (/\bZ-3A\b|\bZ-3 ?A\b/.test(head)) return "Z-3a";
  if (/\bZAS-12\b/.test(head)) return "ZAS-12";
  if (/\bZAS-53\b/.test(head)) return "ZAS-53";
  if (/\bZ-15A\b/.test(head)) return "Z-15A";
  if (/\bZ-15B\b/.test(head)) return "Z-15B";
  if (/\bZ-12\b/.test(head) && /POGRZEB/.test(t)) return "Z-12";
  if (/\bZ-3\b/.test(head)) return "Z-3";
  if (/\bZAM\b/.test(head) || /WNIOSEK O ZASIŁEK MACIERZYŃSKI/.test(t)) return "ZAM";
  if (/POŚWIADCZENIE/.test(head) && /UBEZPIECZ/.test(head)) return "POSWIADCZENIE";
  if (/E-ZLA|ZAŚWIADCZENIE LEKARSKIE/.test(head)) return "E-ZLA";
  if (/KSI|SYSTEM|EKRAN|ZRZUT/.test(head) && /ZASIŁ/.test(t)) return "ZRZUT-SYSTEMU";
  return "NIEZNANY";
}

export function parseDocumentText(text: string): ExtractedDocument {
  const t = normalizeFormText(text);
  const formType = detectFormType(t);

  // --- identyfikatory
  const allPesels = [...t.matchAll(/\b(\d{11})\b/g)].map((m) => m[1]).filter((p) => validatePesel(p).valid);
  const labeledPesel = find(t, /PESEL(?: ubezpieczonej?| wnioskodawcy| ubezpieczonego)?[:\s]*(\d{11})/i);
  const childPesel = find(t, /PESEL dziecka[:\s]*(\d{11})/i);
  const pesel = labeledPesel ?? allPesels.find((p) => p !== childPesel) ?? null;
  const nipRaw = find(t, /NIP(?: płatnika)?[:\s]*([\d -]{10,13})/i);
  const nip = nipRaw ? nipRaw.replace(/[^\d]/g, "") : null;
  const regon = find(t, /REGON[:\s]*(\d{9,14})/i);

  const firstName = find(t, /(?:Pierwsze imię|Imię)(?: ubezpieczone[jg]| wnioskodawcy)?[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż-]+)/);
  const lastName = find(t, /Nazwisko(?: ubezpieczone[jg]| wnioskodawcy)?[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ-]+)/);
  const address = find(t, /Adres(?: zamieszkania)?[:\s]+([^\n]{5,80})/i);
  const payerName = find(t, /(?:Nazwa płatnika(?: składek)?|Nazwa skrócona|Płatnik składek)[: \t]+([^\n]{3,90})/i);
  const insuredCount = find(t, /[Ll]iczba (?:osób zgłoszonych|ubezpieczonych)[^\d\n]{0,80}(\d{1,6})/);

  // --- tytuł ubezpieczenia
  let title: ExtractedDocument["title"] = null;
  const low = t.toLowerCase();
  if (/student|uczeń/.test(low) && /zleceni/.test(low) && /nie podlega/.test(low)) title = "student_zlecenie";
  else if (/ulga na start/.test(low)) title = "ulga_na_start";
  else if (/mały zus/.test(low)) title = "maly_zus_plus";
  else if (/preferencyjn/.test(low)) title = "jdg_preferencyjna";
  else if (/pozarolnicz|działalnoś[ćc] gospodarcz/.test(low)) title = "jdg";
  else if (/umow[ayę] zleceni|zleceniobior/.test(low)) title = "zlecenie";
  else if (/umow[ayę] o pracę|pracownik|stosunek pracy/.test(low) || formType === "Z-3") title = "uop";
  if (formType === "Z-3a" && !title) title = "zlecenie";

  const volYes = /dobrowoln\w* ubezpieczeni\w* chorobow\w*[^\n]{0,40}\b(tak|od)\b/i.test(t) || /chorobowe[:\s]+(tak|dobrowolne)/i.test(t);
  const volNo = /dobrowoln\w* ubezpieczeni\w* chorobow\w*[^\n]{0,40}\bnie\b|nie podlega ubezpieczeni\w* chorobow/i.test(t);
  const voluntarySickness = volNo ? false : volYes ? true : null;

  const insuranceStart = normalizeDate(find(t, new RegExp(String.raw`(?:ubezpieczeni\w* chorobow\w*|zatrudnion\w*|okres zatrudnienia|podlega\w*)[^\n]{0,40}?od[:\s]*` + DATE, "i")));
  const insuranceEnd = normalizeDate(find(t, new RegExp(String.raw`(?:zatrudnieni\w*|ubezpieczeni\w*)[^\n]{0,60}?do[:\s]*` + DATE, "i")));

  let workTimeFraction: number | null = null;
  const etat = find(t, /wymiar czasu pracy[:\s]*([\d/,.]+|pełny)/i);
  if (etat) workTimeFraction = etat === "pełny" ? 1 : etat.includes("/") ? Number(etat.split("/")[0]) / Number(etat.split("/")[1]) : parseAmount(etat);

  // --- wynagrodzenia/przychody: wiersze "2026-01 ... 7 800,00 ... 21/21" albo "01/2026 ..."
  const incomeMonths: ExtractedDocument["incomeMonths"] = [];
  const rowRe = new RegExp(String.raw`(?:^|\n)\s*(\d{4}-\d{2}|\d{2}[/.]\d{4})\s+` + AMOUNT + String.raw`(?:\s*zł)?(?:\s+(\d{1,2})\s*/\s*(\d{1,2}))?`, "g");
  for (const m of t.matchAll(rowRe)) {
    const month = m[1].includes("-") ? m[1] : `${m[1].slice(3)}-${m[1].slice(0, 2)}`;
    const gross = parseAmount(m[2]);
    if (!Number.isFinite(gross) || gross < 50) continue;
    incomeMonths.push({ month, gross, workedDays: m[3] ? Number(m[3]) : null, requiredDays: m[4] ? Number(m[4]) : null });
  }

  const declaredBaseRaw = find(t, new RegExp(String.raw`(?:zadeklarowan\w* podstaw\w*|podstaw\w* wymiaru składek? na ubezpieczenie chorobowe)[^\d\n]{0,40}` + AMOUNT, "i"));
  const debtRaw = find(t, /(?:zadłużeni\w*|zaległoś\w*)[^\n]{0,80}?(\d{1,3}(?:[ \u00a0]?\d{3})*,\d{2})\s*zł/i);

  // --- dziecko
  const dueDate = normalizeDate(find(t, new RegExp(String.raw`(?:przewidywan\w* dat\w* porodu|data\s+przyjęcia\s+dziecka)[:\s]*` + DATE, "i")));
  const childBirth = normalizeDate(find(t, new RegExp(String.raw`(?:data urodzenia dziecka|dziecko urodził[oa] się|(?<!przewidywana )data porodu)[:\s]*` + DATE, "i")));
  const childrenCount = find(t, /liczba dzieci(?: urodzonych przy jednym porodzie| przyjętych)?[:\s]*(\d)/i);
  const zz = find(t, /Za życiem[”"]?[^\n]{0,30}?\b(TAK|NIE)\b/i);
  const gm = t.match(/(\d{2})\.?\s*(?:tydz\w*|tydzień) ciąży|tydzień ciąży[:\s]*(\d{2})/i);
  const gestation = gm ? (gm[1] ?? gm[2]) : null;
  const weight = find(t, /masa urodzeniowa[:\s]*(\d{3,4})/i);
  const hosp = find(t, /(?:pobyt\w* (?:dziecka )?w szpitalu|hospitalizacj\w*)[^\d\n]{0,40}(\d{1,3}) dni/i);
  const adoption = /przysposobieni|rodzin\w* zastępcz|przyjęci\w* dziecka na wychowanie/i.test(t) ? true : null;

  // --- świadczenie
  const benefitType = find(t, /(?:rodzaj świadczenia|wnioskuję o|wnoszę o)[:\s]*(?:wypłatę )?(?:zasiłku )?([a-ząćęłńóśźż +]{6,70})/i);
  const benFrom = normalizeDate(find(t, new RegExp(String.raw`za okres od[:\s]*` + DATE, "i")));
  const benTo = normalizeDate(find(t, new RegExp(String.raw`za okres od[:\s]*\S+\s*do[:\s]*` + DATE, "i")));
  const variant815 = /81,5\s?%/.test(t) ? /\[x\][^\n]{0,80}81,5|81,5[^\n]{0,40}(tak|\[x\])/i.test(t) || /wnioskuję o 81,5/i.test(t) : null;

  // --- zwolnienia lekarskie
  const sickLeaves: ExtractedDocument["sickLeaves"] = [];
  const zlaRe = new RegExp(String.raw`(?:e-?ZLA|ZLA|zaświadczenie lekarskie)\s*(?:seria i nr|nr)?[:\s]*([A-Z]{2,3}\s?\d{5,9})?[^\n]{0,30}?od[:\s]*` + DATE + String.raw`\s*do[:\s]*` + DATE + String.raw`([^\n]{0,40})`, "gi");
  for (const m of t.matchAll(zlaRe)) {
    sickLeaves.push({ series: m[1]?.replace(/\s/g, "") ?? null, from: normalizeDate(m[2])!, to: normalizeDate(m[3])!, codeB: /\bB\b|ciąż/i.test(m[4] ?? "") });
  }

  const bank = find(t, /(?:rachunk\w* bankow\w*|nr rachunku|IBAN)[:\s]*((?:PL)?\s?\d{2}(?:\s?\d{4}){6})/i);

  // --- podpis
  const signedExplicit = /podpisano(?: elektronicznie)?|podpis kwalifikowany|podpis zaufany|\/podpis\/|signed/i.test(t);
  const signatureBlank = /podpis[^\n]{0,20}(?:_{4,}|\.{6,})|podpis[:\s]*$|\(podpis\)\s*$/im.test(t);
  const signed = signedExplicit && !/brak podpisu/i.test(t) ? true : !signatureBlank && /podpis/i.test(t) && /\n\s*[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+ [A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż-]+\s*\n\s*\(?podpis/i.test(t);
  const signatureDate = normalizeDate(find(t, new RegExp(String.raw`(?:data(?: i podpis)?|dnia)[:\s]*` + DATE + String.raw`[^\n]{0,30}podpis`, "i")) ?? find(t, new RegExp(String.raw`(?:Miejscowość i data|Data wypełnienia)[^\n]{0,20}?` + DATE, "i")));

  const decision = find(t, /(?:DECYZJA|Rozstrzygnięcie|Status)[:\s]+([^\n]{4,120})/i);

  return {
    formType,
    insured: {
      firstName,
      lastName,
      pesel,
      birthDate: pesel ? (validatePesel(pesel).birthDate ?? null) : null,
      address,
    },
    payer: {
      name: payerName,
      nip: nip && validateNip(nip).valid ? nip : nip,
      regon,
      insuredCount: insuredCount ? Number(insuredCount) : null,
    },
    title,
    voluntarySickness,
    insuranceStart,
    insuranceEnd,
    workTimeFraction,
    incomeMonths,
    declaredBase: declaredBaseRaw ? parseAmount(declaredBaseRaw) : null,
    contributionDebt: debtRaw ? parseAmount(debtRaw) : null,
    child: {
      firstName: find(t, /Imię dziecka[:\s]+([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+)/),
      pesel: childPesel,
      dueDate,
      birthDate: childBirth,
      childrenCount: childrenCount ? Number(childrenCount) : null,
      zaZyciem: zz ? zz.toUpperCase() === "TAK" : null,
      gestationWeek: gestation ? Number(gestation) : null,
      birthWeightG: weight ? Number(weight) : null,
      hospitalizationDays: hosp ? Number(hosp) : null,
      adoption,
    },
    benefit: { type: benefitType?.trim() ?? null, from: benFrom, to: benTo, variant815 },
    sickLeaves,
    bankAccount: bank ? bank.replace(/\s/g, "") : null,
    signed,
    signatureDate,
    decision,
  };
}
