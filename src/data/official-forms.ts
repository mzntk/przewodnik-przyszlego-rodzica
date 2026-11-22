/**
 * Oficjalne druki ZUS w wersji „Wypełnij i wydrukuj” (edytowalne PDF z zus.pl, stan po 24.10.2026).
 * Jedna definicja pól służy do:
 *  (1) automatycznego wypełniania druku danymi z aplikacji (potok 1 – „system wypełnia za Ciebie”),
 *  (2) odczytu druku wypełnionego samodzielnie i porównania go z danymi aplikacji (potok 2 – „sprawdź swój druk”),
 *  (3) wykrywania wykluczających się zaznaczeń (np. TAK i NIE w tym samym pytaniu).
 * Nazwy pól = nazwy pól AcroForm w plikach z /public/formularze (bez prefiksu „topmostSubform[0].” i bez „[0]”).
 */
import type { Address, CalculationResult, CaseInput, KidInfo, ParentProfile } from "@/models/types";

export type OfficialFormId = "ZAM" | "ZAS-53" | "Z-15" | "Z-12" | "ZCNA" | "Z-3" | "Z-3a" | "ZUA";

export interface OfficialFormMeta {
  id: OfficialFormId;
  code: string;
  title: string;
  /** plik w /public/formularze */
  file: string;
  /** strona konkretnego formularza na zus.pl */
  zusUrl: string;
  /** kto wypełnia */
  filledBy: "ubezpieczony" | "płatnik";
}

export const OFFICIAL_FORMS: Record<OfficialFormId, OfficialFormMeta> = {
  ZAM: { id: "ZAM", code: "ZAM", title: "Wniosek o zasiłek macierzyński", file: "ZAM.pdf", zusUrl: "https://www.zus.pl/-/wniosek-zas-54-1", filledBy: "ubezpieczony" },
  "ZAS-53": { id: "ZAS-53", code: "ZAS-53", title: "Wniosek o zasiłek chorobowy", file: "ZAS-53.pdf", zusUrl: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-chorobowy/-/asset_publisher/TS3WYPoYHIaG/content/zaswiadczenie-zas-53", filledBy: "ubezpieczony" },
  "Z-15": { id: "Z-15", code: "Z-15", title: "Wniosek o zasiłek opiekuńczy (zastąpił Z-15A i Z-15B)", file: "Z-15.pdf", zusUrl: "https://www.zus.pl/-/o%C5%9Bwiadczenie-zus-z-15", filledBy: "ubezpieczony" },
  "Z-12": { id: "Z-12", code: "Z-12", title: "Wniosek o zasiłek pogrzebowy", file: "Z-12.pdf", zusUrl: "https://www.zus.pl/-/wniosek-zus-z-12-1", filledBy: "ubezpieczony" },
  ZCNA: { id: "ZCNA", code: "ZUS ZCNA", title: "Zgłoszenie danych o członkach rodziny (dziecko do ubezpieczenia zdrowotnego)", file: "NFZ-ZGLOSZENIE.pdf", zusUrl: "https://www.zus.pl/wzory-formularzy/firmy/dokumenty-zgloszeniowe-i-rozliczeniowe/-/asset_publisher/7uG0nTlZ0aFc/content/zgloszenie-zus-zcna", filledBy: "płatnik" },
  "Z-3": { id: "Z-3", code: "Z-3", title: "Zaświadczenie płatnika składek (pracownik)", file: "Z-3.pdf", zusUrl: "https://www.zus.pl/wzory-formularzy/zasilki/formularze-dla-pracodawcy/-/asset_publisher/EmpvxIEc9Dbm/content/zaswiadczenie-zus-z-3", filledBy: "płatnik" },
  "Z-3a": { id: "Z-3a", code: "Z-3a", title: "Zaświadczenie płatnika składek (osoba niebędąca pracownikiem)", file: "Z-3a.pdf", zusUrl: "https://www.zus.pl/wzory-formularzy/zasilki/formularze-dla-pracodawcy/-/asset_publisher/EmpvxIEc9Dbm/content/zaswiadczenie-zus-z-3a", filledBy: "płatnik" },
  ZUA: { id: "ZUA", code: "ZUS ZUA", title: "Zgłoszenie do ubezpieczeń / zgłoszenie zmiany danych", file: "ZUS-ZUA.pdf", zusUrl: "https://www.zus.pl/-/zgloszenie-zua", filledBy: "płatnik" },
};

/** Normalizacja nazwy pola AcroForm: „topmostSubform[0].Page1[0].PESEL[0]” → „Page1.PESEL”. */
export const fieldKey = (raw: string) => raw.replace(/^(topmostSubform|form1)\[\d+\]\./, "").replace(/\[\d+\]/g, "");

/* ------------------------------ kontekst ------------------------------ */

export interface FormCtx {
  d: Omit<CaseInput, "asOf">;
  r: CalculationResult;
  /** osoba składająca druk */
  who: "matka" | "ojciec";
  today: string;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** dd/mm/rrrr w kratkach druku: „15012027” */
export const date8 = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}` : "");
export const dDots = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
const up = (s?: string | null) => (s ?? "").toLocaleUpperCase("pl-PL");
const period = (from?: string, to?: string) => (from && to ? `OD ${dDots(from)} DO ${dDots(to)}` : "");
const street = (a?: Address) => up(a?.street.replace(/^ul\.\s*/i, ""));
const kidName = (k: KidInfo, fallbackLast: string) => up([k.fullName || k.name, k.lastName || fallbackLast].filter(Boolean).join(" "));
function kidsText(c: FormCtx) {
  const ch = c.d.child;
  const last = c.d.mother.lastName;
  const kids = ch.kids?.length ? ch.kids : [{}];
  return kids.map((k) => [kidName(k, last), ch.birthDate ? `UR. ${dDots(ch.birthDate)}` : "", up(k.birthPlace)].filter(Boolean).join(", ")).join("; ");
}
const applicant = (c: FormCtx): ParentProfile => (c.who === "ojciec" && c.d.father ? c.d.father : c.d.mother);
const other = (c: FormCtx): ParentProfile | undefined => (c.who === "ojciec" ? c.d.mother : c.d.father);
const jdgTitle = (p: ParentProfile) => ["jdg", "jdg_preferencyjna", "maly_zus_plus", "ulga_na_start"].includes(p.title);
/** Płatnik składek: pracodawca / zleceniodawca albo własna firma. */
const payerOf = (p: ParentProfile) => (jdgTitle(p) && p.business ? { name: p.business.name, nip: p.business.nip, regon: p.business.regon, address: p.business.address } : p.payer ? { name: p.payer.name, nip: p.payer.nip, regon: p.payer.regon ?? "", address: p.payer.address } : null);
const segs = (c: FormCtx, kinds: (k: string) => boolean, who = c.who) => c.r.segments.filter((s) => s.who === who && kinds(s.kind));

/* ------------------------------ definicje pól ------------------------------ */

export type FieldValue = string | boolean;
export interface OfficialField {
  name: string;
  label: string;
  section: string;
  check?: boolean;
  /** wartość z danych aplikacji (potok 1); undefined = zostaw puste */
  fill?: (c: FormCtx) => FieldValue | undefined;
  /** odczyt do ustandaryzowanego dokumentu (potok 2) */
  read?: "pesel" | "firstName" | "lastName" | "nip" | "regon" | "payerName" | "bank" | "dueDate" | "childText" | "signDate" | "variant815" | "voluntaryYes" | "voluntaryNo" | "adoption" | "zaZyciem" | "periodMat" | "periodPar" | "periodSup" | "periodPat" | "street" | "house" | "postal" | "city" | "sickPeriod" | "childPesel" | "childFirst" | "childLast" | "childBirth";
}

const person = (section: string, p: (c: FormCtx) => ParentProfile | undefined, prefix = "Page1."): OfficialField[] => [
  { name: `${prefix}PESEL`, label: "PESEL", section, fill: (c) => p(c)?.pesel, read: "pesel" },
  { name: `${prefix}Imie`, label: "Imię", section, fill: (c) => up(p(c)?.firstName), read: "firstName" },
  { name: `${prefix}Nazwisko`, label: "Nazwisko", section, fill: (c) => up(p(c)?.lastName), read: "lastName" },
];
const addressFields = (section: string, p: (c: FormCtx) => ParentProfile | undefined, cityField = "Page1.Poczta"): OfficialField[] => [
  { name: "Page1.Ulica", label: "Ulica", section, fill: (c) => street(p(c)?.address), read: "street" },
  { name: "Page1.Numerdomu", label: "Numer domu", section, fill: (c) => p(c)?.address?.house, read: "house" },
  { name: "Page1.Numerlokalu", label: "Numer lokalu", section, fill: (c) => p(c)?.address?.flat },
  { name: "Page1.Kodpocztowy", label: "Kod pocztowy", section, fill: (c) => p(c)?.address?.postalCode, read: "postal" },
  { name: cityField, label: "Miejscowość", section, fill: (c) => up(p(c)?.address?.city), read: "city" },
  { name: "Page1.Numertelefonu", label: "Numer telefonu (dobrowolnie)", section, fill: (c) => p(c)?.phone },
];
const payerFields = (section: string, prefix: string): OfficialField[] => [
  { name: `${prefix}NIP`, label: "NIP płatnika", section, fill: (c) => payerOf(applicant(c))?.nip, read: "nip" },
  { name: `${prefix}REGON`, label: "REGON płatnika", section, fill: (c) => payerOf(applicant(c))?.regon, read: "regon" },
  { name: `${prefix}Nazwaplatnika`, label: "Nazwa płatnika", section, fill: (c) => up(payerOf(applicant(c))?.name), read: "payerName" },
];

const ZAM_FIELDS: OfficialField[] = [
  ...person("Twoje dane", applicant),
  ...addressFields("Twoje dane", applicant),
  ...payerFields("Dane płatnika składek", "Page1."),
  { name: "Page2.Numerrachunku", label: "Rachunek bankowy", section: "Rachunek bankowy", fill: (c) => applicant(c).bankAccount?.replace(/\D/g, ""), read: "bank" },
  // zakres wniosku
  { name: "Page2.macierzynskiego", label: "urlopu macierzyńskiego", section: "Zakres wniosku", check: true, fill: (c) => c.who === "matka" && c.d.child.path === "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page2.nawarunkach", label: "urlopu na warunkach urlopu macierzyńskiego", section: "Zakres wniosku", check: true, fill: (c) => c.who === "matka" && c.d.child.path !== "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page2.Okres", label: "Okres urlopu macierzyńskiego (od–do)", section: "Zakres wniosku", fill: (c) => (c.who === "matka" ? period(segs(c, (k) => k === "macierzynski")[0]?.from, segs(c, (k) => k === "macierzynski")[0]?.to) : undefined), read: "periodMat" },
  { name: "Page2.rodzicielskiego", label: "urlopu rodzicielskiego", section: "Zakres wniosku", check: true, fill: (c) => segs(c, (k) => k.startsWith("rodzicielski")).length > 0 },
  { name: "Page2.Okres2", label: "Okres urlopu rodzicielskiego (od–do)", section: "Zakres wniosku", fill: (c) => { const p = segs(c, (k) => k.startsWith("rodzicielski")); return p.length ? period(p[0].from, p.at(-1)!.to) : undefined; }, read: "periodPar" },
  { name: "Page2.czesc", label: "Która to część urlopu rodzicielskiego", section: "Zakres wniosku", fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length ? "1" : undefined) },
  { name: "Page2.uzMacierzynskiego", label: "uzupełniającego urlopu macierzyńskiego", section: "Zakres wniosku", check: true, fill: (c) => c.who === "matka" && segs(c, (k) => k === "uzupelniajacy").length > 0 },
  { name: "Page2.Okres3", label: "Okres uzupełniającego urlopu macierzyńskiego", section: "Zakres wniosku", fill: (c) => { const s = c.who === "matka" ? segs(c, (k) => k === "uzupelniajacy")[0] : undefined; return s ? period(s.from, s.to) : undefined; }, read: "periodSup" },
  { name: "Page2.ojcowskiego", label: "urlopu ojcowskiego", section: "Zakres wniosku", check: true, fill: (c) => c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length > 0 },
  { name: "Page2.Okres4", label: "Okres urlopu ojcowskiego (od–do)", section: "Zakres wniosku", fill: (c) => { const p = c.who === "ojciec" ? segs(c, (k) => k === "ojcowski") : []; return p.length ? p.map((s) => period(s.from, s.to)).join("; ") : undefined; }, read: "periodPat" },
  { name: "Page2.Numerlokalu2", label: "Która to część urlopu ojcowskiego", section: "Zakres wniosku", fill: (c) => (c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length ? "1" : undefined) },
  { name: "Page2.Data2", label: "Data zakończenia zasiłku za urlop macierzyński", section: "Zakres wniosku", fill: (c) => { const m = segs(c, (k) => k === "macierzynski", "matka")[0]; return m && (segs(c, (k) => k.startsWith("rodzicielski")).length || segs(c, (k) => k === "uzupelniajacy").length) ? date8(m.to) : undefined; } },
  { name: "Page2.informuje", label: "Zamierzam skorzystać z pełnego wymiaru urlopów (81,5% za cały okres)", section: "Zakres wniosku", check: true, fill: (c) => c.who === "matka" && c.d.plan.variant === "combined", read: "variant815" },
  // ubezpieczenie (tylko działalność / współpraca / duchowni / marynarze)
  { name: "Page2.TAK", label: "Objęty ubezpieczeniem chorobowym (działalność) – TAK", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => (jdgTitle(applicant(c)) ? applicant(c).voluntarySickness : undefined), read: "voluntaryYes" },
  { name: "Page2.NIE", label: "Objęty ubezpieczeniem chorobowym (działalność) – NIE", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => (jdgTitle(applicant(c)) ? !applicant(c).voluntarySickness : undefined), read: "voluntaryNo" },
  // podstawa
  { name: "Page2.ZaznaczX1a", label: "1. urodzeniem dziecka/dzieci", section: "Wnioskuję w związku z", check: true, fill: (c) => !!c.d.child.birthDate && c.d.child.path === "biologiczny" && !c.d.mother.employmentLossReason },
  { name: "Page2.ZaznaczX1b", label: "1. przyjęciem dziecka na wychowanie i wystąpieniem do sądu o przysposobienie", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.child.path === "adopcja", read: "adoption" },
  { name: "Page2.Data", label: "Data przyjęcia na wychowanie", section: "Wnioskuję w związku z", fill: (c) => (c.d.child.path !== "biologiczny" ? date8(c.d.child.birthDate ?? c.d.child.dueDate) : undefined) },
  { name: "Page2.ZaznaczX1c", label: "1. przyjęciem dziecka na wychowanie w ramach rodziny zastępczej", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.child.path === "rodzina_zastepcza", read: "adoption" },
  { name: "Page3.Tekst1", label: "Dane dziecka (imię, nazwisko, data i miejsce urodzenia)", section: "Wnioskuję w związku z", fill: (c) => (c.d.child.birthDate || c.d.child.path !== "biologiczny" ? kidsText(c) : undefined), read: "childText" },
  { name: "Page3.ZaznaczX1", label: "Dziecko ma zaświadczenie „Za życiem”", section: "Wnioskuję w związku z", check: true, fill: (c) => !!c.d.child.zaZyciem && !!c.d.child.birthDate, read: "zaZyciem" },
  { name: "Page3._2", label: "2. przewidywaną datą porodu", section: "Wnioskuję w związku z", check: true, fill: (c) => !c.d.child.birthDate && c.d.child.path === "biologiczny" },
  { name: "Page3.Data2a", label: "Przewidywana data porodu", section: "Wnioskuję w związku z", fill: (c) => (!c.d.child.birthDate && c.d.child.path === "biologiczny" ? date8(c.d.child.dueDate) : undefined), read: "dueDate" },
  { name: "Page3._3", label: "3. urodzeniem dziecka po ustaniu zatrudnienia", section: "Wnioskuję w związku z", check: true, fill: (c) => !!c.d.mother.employmentLossReason && !!c.d.child.birthDate },
  { name: "Page3.upadlosc", label: "pracodawca ogłosił upadłość", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "upadlosc" },
  { name: "Page3.likwidacje", label: "pracodawca ogłosił likwidację", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "likwidacja" },
  { name: "Page3.rozwiazal", label: "rozwiązanie umowy z naruszeniem prawa (wyrok)", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "bezprawne_zwolnienie" },
  { name: "Page3.zmarl", label: "pracodawca zmarł", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "smierc_pracodawcy" },
  { name: "Page3._4", label: "4. urodzeniem dziecka i jego pobytem w szpitalu (uzupełniający)", section: "Urlop uzupełniający", check: true, fill: (c) => c.who === "matka" && c.r.leave.supplementaryWeeks > 0 },
  { name: "Page3.skroceniem", label: "urodzenie przed ukończeniem 28. tygodnia ciąży", section: "Urlop uzupełniający", check: true, fill: (c) => c.r.leave.supplementaryWeeks > 0 && (c.d.child.gestationWeek ?? 40) < 28 },
  { name: "Page3.przerwaniem4A", label: "masa urodzeniowa nie większa niż 1000 g", section: "Urlop uzupełniający", check: true, fill: (c) => c.r.leave.supplementaryWeeks > 0 && (c.d.child.birthWeightsG ?? []).some((w) => w <= 1000) },
  { name: "Page3.przerwaniem4B", label: "urodzenie między 28. a 37. tygodniem i masa > 1000 g", section: "Urlop uzupełniający", check: true, fill: (c) => c.r.leave.supplementaryWeeks > 0 && (c.d.child.gestationWeek ?? 40) >= 28 && (c.d.child.gestationWeek ?? 40) < 37 && !(c.d.child.birthWeightsG ?? []).some((w) => w <= 1000) },
  { name: "Page3.podjeciem", label: "urodzenie po 37. tygodniu i pobyt w szpitalu ≥ 2 dni (5.–28. dzień)", section: "Urlop uzupełniający", check: true, fill: (c) => c.r.leave.supplementaryWeeks > 0 && (c.d.child.gestationWeek ?? 40) >= 37 },
  { name: "Page3.Tekst4a", label: "Okres pobytu dziecka w szpitalu", section: "Urlop uzupełniający", fill: (c) => { const ch = c.d.child; const days = ch.hospitalizationDays?.[0]; if (!(c.r.leave.supplementaryWeeks > 0) || !ch.birthDate || !days) return undefined; const start = new Date(Date.parse(ch.birthDate) + ((ch.hospitalizationStartDay ?? 1) - 1) * 86_400_000).toISOString().slice(0, 10); return period(start, new Date(Date.parse(start) + (days - 1) * 86_400_000).toISOString().slice(0, 10)); } },
  { name: "Page4.Tekst13", label: "Dane dziecka (urlop uzupełniający)", section: "Urlop uzupełniający", fill: (c) => (c.who === "matka" && c.r.leave.supplementaryWeeks > 0 ? kidsText(c) : undefined) },
  // oświadczenie (ojcowski)
  { name: "Page5.TAK2", label: "Pobierałem z innego tytułu zasiłek za okres urlopu ojcowskiego – TAK", section: "Oświadczenie (urlop ojcowski)", check: true },
  { name: "Page5.NIE2", label: "Pobierałem z innego tytułu zasiłek za okres urlopu ojcowskiego – NIE", section: "Oświadczenie (urlop ojcowski)", check: true, fill: (c) => (c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length ? true : undefined) },
  // informacja (rodzicielski / uzupełniający)
  { name: "Page5.TAK", label: "Drugi rodzic będzie korzystał z zasiłku za urlop rodzicielski – TAK", section: "Informacja o drugim rodzicu", check: true, fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length ? segs(c, (k) => k.startsWith("rodzicielski"), c.who === "matka" ? "ojciec" : "matka").length > 0 : undefined) },
  { name: "Page5.NIE", label: "Drugi rodzic będzie korzystał z zasiłku za urlop rodzicielski – NIE", section: "Informacja o drugim rodzicu", check: true, fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length ? segs(c, (k) => k.startsWith("rodzicielski"), c.who === "matka" ? "ojciec" : "matka").length === 0 : undefined) },
  { name: "Page5.Okres", label: "Okres, w którym drugi rodzic skorzysta z urlopu", section: "Informacja o drugim rodzicu", fill: (c) => { const p = segs(c, (k) => k.startsWith("rodzicielski"), c.who === "matka" ? "ojciec" : "matka"); return p.length && segs(c, (k) => k.startsWith("rodzicielski")).length ? period(p[0].from, p.at(-1)!.to) : undefined; } },
  { name: "Page5.PESEL", label: "PESEL drugiego rodzica", section: "Informacja o drugim rodzicu", fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length || c.r.leave.supplementaryWeeks ? other(c)?.pesel : undefined) },
  { name: "Page5.Imie", label: "Imię drugiego rodzica", section: "Informacja o drugim rodzicu", fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length || c.r.leave.supplementaryWeeks ? up(other(c)?.firstName) : undefined) },
  { name: "Page5.Nazwisko", label: "Nazwisko drugiego rodzica", section: "Informacja o drugim rodzicu", fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length || c.r.leave.supplementaryWeeks ? up(other(c)?.lastName) : undefined) },
  { name: "Page5.Data", label: "Data wypełnienia", section: "Podpis", fill: (c) => date8(c.today), read: "signDate" },
];

const ZAS53_FIELDS: OfficialField[] = [
  ...person("Twoje dane", applicant),
  ...addressFields("Twoje dane", applicant),
  ...payerFields("Dane płatnika składek", "Page1."),
  { name: "Page2.Numerrachunku", label: "Rachunek bankowy", section: "Rachunek bankowy", fill: (c) => applicant(c).bankAccount?.replace(/\D/g, ""), read: "bank" },
  { name: "Page2.Tekst", label: "Daty niezdolności do pracy (od–do) i seria/numer zaświadczenia", section: "Wniosek", fill: (c) => applicant(c).sickLeaves.map((l) => `${period(l.from, l.to)}${l.codeB ? " (KOD B – CIĄŻA)" : ""}`).join("; ") || undefined, read: "sickPeriod" },
  { name: "Page2.wniosek1A", label: "niezdolność w okresie ubezpieczenia chorobowego", section: "Wniosek", check: true, fill: (c) => applicant(c).sickLeaves.length > 0 },
  { name: "Page2.wniosek1B", label: "niezdolność po ustaniu tytułu ubezpieczenia", section: "Wniosek", check: true },
  { name: "Page2.Data", label: "Data ustania tytułu ubezpieczenia", section: "Wniosek" },
  { name: "Page2.choroby", label: "z powodu choroby zawodowej", section: "Przyczyna niezdolności", check: true },
  { name: "Page2.przypracy", label: "z powodu wypadku przy pracy", section: "Przyczyna niezdolności", check: true },
  { name: "Page2.wdrodze", label: "z powodu wypadku w drodze do/z pracy", section: "Przyczyna niezdolności", check: true },
  { name: "Page2.TAK_5", label: "Choroba zawodowa / wypadek – TAK", section: "Przyczyna niezdolności", check: true },
  { name: "Page2.NIE_5", label: "Choroba zawodowa / wypadek – NIE", section: "Przyczyna niezdolności", check: true, fill: (c) => applicant(c).sickLeaves.length > 0 },
  { name: "Page2.TAK_6", label: "Marynarz – wynagrodzenie za okres niezdolności – TAK", section: "Marynarze", check: true },
  { name: "Page2.NIE_6", label: "Marynarz – wynagrodzenie za okres niezdolności – NIE", section: "Marynarze", check: true },
  { name: "Page2.Data2", label: "Data wypełnienia", section: "Podpis", fill: (c) => date8(c.today), read: "signDate" },
];

const child0 = (c: FormCtx) => c.d.child.kids?.[0];
const Z15_FIELDS: OfficialField[] = [
  ...person("Twoje dane", applicant),
  { name: "Page1.Ulica", label: "Ulica", section: "Twoje dane", fill: (c) => street(applicant(c).address), read: "street" },
  { name: "Page1.Numerdomu", label: "Numer domu", section: "Twoje dane", fill: (c) => applicant(c).address?.house, read: "house" },
  { name: "Page1.Numerlokalu", label: "Numer lokalu", section: "Twoje dane", fill: (c) => applicant(c).address?.flat },
  { name: "Page1.Kodpocztowy", label: "Kod pocztowy", section: "Twoje dane", fill: (c) => applicant(c).address?.postalCode, read: "postal" },
  { name: "Page1.Miejscowosc", label: "Miejscowość", section: "Twoje dane", fill: (c) => up(applicant(c).address?.city), read: "city" },
  { name: "Page1.Numertelefonu", label: "Numer telefonu (dobrowolnie)", section: "Twoje dane", fill: (c) => applicant(c).phone },
  ...payerFields("Dane płatnika składek", "Page2."),
  { name: "Page2.Numerrachunku", label: "Rachunek bankowy", section: "Rachunek bankowy", fill: (c) => applicant(c).bankAccount?.replace(/\D/g, ""), read: "bank" },
  { name: "Page2.Tekst1a", label: "Okres opieki (od–do) i seria/nr zaświadczenia", section: "Okres opieki", fill: (c) => (c.d.care?.enabled ? `${c.d.care.days} DNI (DATY I NR ZAŚWIADCZENIA LEKARSKIEGO – UZUPEŁNIJ)` : undefined) },
  { name: "Page2.PESEL", label: "PESEL dziecka", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => child0(c)?.pesel, read: "childPesel" },
  { name: "Page2.Imie", label: "Imię dziecka", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => up(child0(c)?.fullName || child0(c)?.name), read: "childFirst" },
  { name: "Page2.Nazwisko", label: "Nazwisko dziecka", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => up(child0(c)?.lastName || c.d.mother.lastName), read: "childLast" },
  { name: "Page2.Dataurodzenia", label: "Data urodzenia dziecka (gdy brak PESEL)", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => (!child0(c)?.pesel ? date8(c.d.child.birthDate) : undefined), read: "childBirth" },
  { name: "Page2.pokrewienstwo", label: "Stopień pokrewieństwa", section: "Osoba, nad którą sprawujesz opiekę", fill: () => "DZIECKO" },
  { name: "Page2.OrzeczenieTAK", label: "Dziecko ma orzeczenie o niepełnosprawności – TAK", section: "Osoba, nad którą sprawujesz opiekę", check: true },
  { name: "Page2.OrzeczenieNIE", label: "Dziecko ma orzeczenie o niepełnosprawności – NIE", section: "Osoba, nad którą sprawujesz opiekę", check: true, fill: (c) => (c.d.care?.enabled ? true : undefined) },
  { name: "Page3.Oswiadczenie1TAK", label: "Jest domownik mogący zapewnić opiekę – TAK", section: "Oświadczenia", check: true },
  { name: "Page3.Oswiadczenie1NIE", label: "Jest domownik mogący zapewnić opiekę – NIE", section: "Oświadczenia", check: true, fill: (c) => (c.d.care?.enabled ? true : undefined) },
  { name: "Page3.Oswiadczenie2TAK", label: "Wspólne gospodarstwo z dzieckiem > 14 lat / chorym – TAK", section: "Oświadczenia", check: true },
  { name: "Page3.Oswiadczenie2NIE", label: "Wspólne gospodarstwo z dzieckiem > 14 lat / chorym – NIE", section: "Oświadczenia", check: true },
  { name: "Page3.Oswiadczenie3TAK", label: "Zasiłek opiekuńczy od poprzedniego płatnika – TAK", section: "Oświadczenia", check: true },
  { name: "Page3.Oswiadczenie3NIE", label: "Zasiłek opiekuńczy od poprzedniego płatnika – NIE", section: "Oświadczenia", check: true },
  { name: "Page3.Oswiadczenie3NIEZMIENILEM", label: "Nie zmieniałem płatnika", section: "Oświadczenia", check: true, fill: (c) => (c.d.care?.enabled ? true : undefined) },
  { name: "Page3.Niemammalzonka", label: "Drugi rodzic dziecka nieznany", section: "Drugi rodzic dziecka", check: true },
  { name: "Page3.PESEL", label: "PESEL drugiego rodzica", section: "Drugi rodzic dziecka", fill: (c) => other(c)?.pesel },
  { name: "Page3.Imie", label: "Imię drugiego rodzica", section: "Drugi rodzic dziecka", fill: (c) => up(other(c)?.firstName) },
  { name: "Page3.Nazwisko", label: "Nazwisko drugiego rodzica", section: "Drugi rodzic dziecka", fill: (c) => up(other(c)?.lastName) },
  { name: "Page3.Dane2TAK", label: "Drugi rodzic otrzymał w tym roku zasiłek opiekuńczy – TAK", section: "Drugi rodzic dziecka", check: true },
  { name: "Page3.Dane2NIE", label: "Drugi rodzic otrzymał w tym roku zasiłek opiekuńczy – NIE", section: "Drugi rodzic dziecka", check: true },
  { name: "Page4.Niemammalzonka", label: "Nie mam małżonka", section: "Małżonek", check: true },
  { name: "Page5.Data", label: "Data wypełnienia", section: "Podpis", fill: (c) => date8(c.today), read: "signDate" },
];

const Z12_FIELDS: OfficialField[] = [
  { name: "Page1.PESEL", label: "PESEL osoby zmarłej (dziecka)", section: "Dane osoby zmarłej", fill: (c) => child0(c)?.pesel },
  { name: "Page1.Imie", label: "Imię osoby zmarłej", section: "Dane osoby zmarłej", fill: (c) => up(child0(c)?.fullName || child0(c)?.name) },
  { name: "Page1.Nazwisko", label: "Nazwisko osoby zmarłej", section: "Dane osoby zmarłej", fill: (c) => up(child0(c)?.lastName || c.d.mother.lastName) },
  { name: "Page1.Dataimiejscezgonu", label: "Data i miejsce zgonu", section: "Dane osoby zmarłej", fill: (c) => { const dd = c.d.child.childDeathDate ?? (c.d.child.stillbirth ? c.d.child.birthDate ?? c.d.child.dueDate : undefined); return dd ? dDots(dd) : undefined; } },
  { name: "Page1.Bylaczlonkiem", label: "Była członkiem rodziny wnioskodawcy", section: "Dane osoby zmarłej", check: true, fill: (c) => (c.d.child.stillbirth || c.d.child.childDeathDate ? true : undefined) },
  { name: "Page1.Niebylaczlonkiem", label: "Nie była członkiem rodziny wnioskodawcy", section: "Dane osoby zmarłej", check: true },
  { name: "Page2.PESEL", label: "PESEL wnioskodawcy", section: "Twoje dane", fill: (c) => applicant(c).pesel, read: "pesel" },
  { name: "Page2.Imie", label: "Imię", section: "Twoje dane", fill: (c) => up(applicant(c).firstName), read: "firstName" },
  { name: "Page2.Nazwisko", label: "Nazwisko", section: "Twoje dane", fill: (c) => up(applicant(c).lastName), read: "lastName" },
  { name: "Page2.Ulica", label: "Ulica", section: "Twoje dane", fill: (c) => street(applicant(c).address) },
  { name: "Page2.Numerdomu", label: "Numer domu", section: "Twoje dane", fill: (c) => applicant(c).address?.house },
  { name: "Page2.Numerlokalu", label: "Numer lokalu", section: "Twoje dane", fill: (c) => applicant(c).address?.flat },
  { name: "Page2.Kodpocztowy", label: "Kod pocztowy", section: "Twoje dane", fill: (c) => applicant(c).address?.postalCode },
  { name: "Page2.Poczta", label: "Miejscowość", section: "Twoje dane", fill: (c) => up(applicant(c).address?.city) },
  { name: "Page2.Numertelefonu", label: "Numer telefonu", section: "Twoje dane", fill: (c) => applicant(c).phone },
  { name: "Page3.Pokrylem", label: "Pokryłem koszty pogrzebu", section: "Koszty pogrzebu", check: true, fill: (c) => (c.d.child.stillbirth || c.d.child.childDeathDate ? true : undefined) },
  { name: "Page3.Niepokrylem", label: "Nie pokryłem kosztów pogrzebu", section: "Koszty pogrzebu", check: true },
  { name: "Page4.Narachunek", label: "Wypłata na rachunek bankowy", section: "Sposób wypłaty", check: true, fill: (c) => !!applicant(c).bankAccount },
  { name: "Page4.Naadres", label: "Wypłata na adres", section: "Sposób wypłaty", check: true, fill: (c) => !applicant(c).bankAccount },
  { name: "Page4.Numerrachunku", label: "Rachunek bankowy", section: "Sposób wypłaty", fill: (c) => applicant(c).bankAccount?.replace(/\D/g, ""), read: "bank" },
  { name: "Page5.AktualnaData", label: "Data wypełnienia", section: "Podpis", fill: (c) => dDots(c.today), read: "signDate" },
];

const ZCNA_FIELDS: OfficialField[] = [
  { name: "Page1.II01_NrNIP", label: "NIP płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.nip, read: "nip" },
  { name: "Page1.II02_NrREGON", label: "REGON płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.regon, read: "regon" },
  { name: "Page1.II06_NazwaSkrocona", label: "Nazwa skrócona płatnika", section: "Dane płatnika", fill: (c) => up(payerOf(applicant(c))?.name), read: "payerName" },
  { name: "Page1.III01_NrPESEL", label: "PESEL ubezpieczonego (rodzica)", section: "Dane ubezpieczonego", fill: (c) => applicant(c).pesel, read: "pesel" },
  { name: "Page1.III05_Nazwisko", label: "Nazwisko ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => up(applicant(c).lastName), read: "lastName" },
  { name: "Page1.III06_Imie", label: "Imię ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => up(applicant(c).firstName), read: "firstName" },
  { name: "Page1.III07_DataUrodzenia", label: "Data urodzenia ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => date8(applicant(c).birthDate) },
  { name: "Page1.IV02A_DataUrodzenia", label: "Data zgłoszenia / zmiany", section: "Członek rodziny – dziecko", fill: (c) => date8(c.today) },
  { name: "Page1.IV03A_NrPESEL", label: "PESEL dziecka", section: "Członek rodziny – dziecko", fill: (c) => child0(c)?.pesel, read: "childPesel" },
  { name: "Page1.IV07A_Nazwisko", label: "Nazwisko dziecka", section: "Członek rodziny – dziecko", fill: (c) => up(child0(c)?.lastName || applicant(c).lastName), read: "childLast" },
  { name: "Page1.IV08A_Imie", label: "Imię dziecka", section: "Członek rodziny – dziecko", fill: (c) => up(child0(c)?.fullName || child0(c)?.name), read: "childFirst" },
  { name: "Page1.IV09A_DataUrodzenia", label: "Data urodzenia dziecka", section: "Członek rodziny – dziecko", fill: (c) => date8(c.d.child.birthDate), read: "childBirth" },
  { name: "Page1.IV11A", label: "Wspólne gospodarstwo domowe z ubezpieczonym", section: "Członek rodziny – dziecko", check: true, fill: () => true },
  { name: "Page1.IV01B_kodpocztowy", label: "Kod pocztowy", section: "Adres dziecka", fill: (c) => applicant(c).address?.postalCode?.replace("-", "") },
  { name: "Page1.IV02B_miejscowosc", label: "Miejscowość", section: "Adres dziecka", fill: (c) => up(applicant(c).address?.city) },
  { name: "Page1.IV03B_gmina", label: "Gmina / dzielnica", section: "Adres dziecka", fill: (c) => up(applicant(c).address?.commune ?? applicant(c).address?.city) },
  { name: "Page1.IV04B_ulica", label: "Ulica", section: "Adres dziecka", fill: (c) => street(applicant(c).address) },
  { name: "Page1.IV05B_nrdomu", label: "Numer domu", section: "Adres dziecka", fill: (c) => applicant(c).address?.house },
  { name: "Page1.IV06B_nrlokalu", label: "Numer lokalu", section: "Adres dziecka", fill: (c) => applicant(c).address?.flat },
  { name: "Page1.IV07B_nrtelefonu", label: "Telefon", section: "Adres dziecka", fill: (c) => applicant(c).phone?.replace(/\s/g, "") },
  { name: "Page2.VI01_DataWypelnienia", label: "Data wypełnienia", section: "Oświadczenie", fill: (c) => date8(c.today), read: "signDate" },
];

export const OFFICIAL_FIELDS: Partial<Record<OfficialFormId, OfficialField[]>> = { ZAM: ZAM_FIELDS, "ZAS-53": ZAS53_FIELDS, "Z-15": Z15_FIELDS, "Z-12": Z12_FIELDS, ZCNA: ZCNA_FIELDS };

/* ------------------------------ wykluczające się zaznaczenia ------------------------------ */

/** Element grupy: pole albo „którekolwiek z pól” (np. cała odpowiedź 1. z podpunktami a–c). */
type GroupItem = string | string[];
export const EXCLUSIVE: Partial<Record<OfficialFormId, { label: string; items: GroupItem[] }[]>> = {
  ZAM: [
    { label: "Urlop macierzyński albo urlop na warunkach urlopu macierzyńskiego", items: ["Page2.macierzynskiego", "Page2.nawarunkach"] },
    { label: "Objęcie ubezpieczeniem chorobowym (TAK / NIE)", items: ["Page2.TAK", "Page2.NIE"] },
    { label: "Podstawa wniosku – pkt 1 (urodzenie / przysposobienie / rodzina zastępcza)", items: ["Page2.ZaznaczX1a", "Page2.ZaznaczX1b", "Page2.ZaznaczX1c"] },
    { label: "Podstawa wniosku – pkt 1, 2 i 3 wykluczają się (dziecko urodzone / przewidywana data porodu / urodzenie po ustaniu zatrudnienia)", items: [["Page2.ZaznaczX1a", "Page2.ZaznaczX1b", "Page2.ZaznaczX1c"], "Page3._2", "Page3._3"] },
    { label: "Przyczyna ustania zatrudnienia (upadłość / likwidacja / naruszenie prawa / śmierć pracodawcy)", items: ["Page3.upadlosc", "Page3.likwidacje", "Page3.rozwiazal", "Page3.zmarl"] },
    { label: "Urlop uzupełniający – „28.–37. tydzień i masa > 1000 g” wyklucza „przed 28. tygodniem” i „po 37. tygodniu”", items: ["Page3.skroceniem", "Page3.przerwaniem4B", "Page3.podjeciem"] },
    { label: "Urlop uzupełniający – „masa ≤ 1000 g” wyklucza „28.–37. tydzień i masa > 1000 g” i „po 37. tygodniu”", items: ["Page3.przerwaniem4A", "Page3.przerwaniem4B", "Page3.podjeciem"] },
    { label: "Sytuacja matki (pkt 5) – można wskazać jedną", items: ["Page4.skroceniem", "Page4.przerwaniem4A", "Page4.przerwaniem4B", "Page4.podjeciem", "Page4.porzuceniem", "Page4.smiercia"] },
    { label: "Wypisanie ze szpitala – mnie albo dziecka", items: ["Page5.mnie5", "Page5.dziecka5"] },
    { label: "Oświadczenie o urlopie ojcowskim (TAK / NIE)", items: ["Page5.TAK2", "Page5.NIE2"] },
    { label: "Informacja o drugim rodzicu (TAK / NIE)", items: ["Page5.TAK", "Page5.NIE"] },
  ],
  "ZAS-53": [
    { label: "Niezdolność w okresie ubezpieczenia albo po jego ustaniu", items: ["Page2.wniosek1A", "Page2.wniosek1B"] },
    { label: "Przyczyna niezdolności (choroba zawodowa / wypadek przy pracy / w drodze)", items: ["Page2.choroby", "Page2.przypracy", "Page2.wdrodze"] },
    { label: "Choroba zawodowa lub wypadek (TAK / NIE)", items: ["Page2.TAK_5", "Page2.NIE_5"] },
    { label: "Zaznaczono przyczynę (choroba zawodowa / wypadek), a jednocześnie „NIE”", items: [["Page2.choroby", "Page2.przypracy", "Page2.wdrodze"], "Page2.NIE_5"] },
    { label: "Wynagrodzenie marynarza (TAK / NIE)", items: ["Page2.TAK_6", "Page2.NIE_6"] },
  ],
  "Z-15": [
    { label: "Orzeczenie o niepełnosprawności dziecka (TAK / NIE)", items: ["Page2.OrzeczenieTAK", "Page2.OrzeczenieNIE"] },
    { label: "Oświadczenie 1 – domownik (TAK / NIE)", items: ["Page3.Oswiadczenie1TAK", "Page3.Oswiadczenie1NIE"] },
    { label: "Oświadczenie 2 – wspólne gospodarstwo (TAK / NIE)", items: ["Page3.Oswiadczenie2TAK", "Page3.Oswiadczenie2NIE"] },
    { label: "Oświadczenie 3 – zmiana płatnika (TAK / NIE / nie zmieniałem)", items: ["Page3.Oswiadczenie3TAK", "Page3.Oswiadczenie3NIE", "Page3.Oswiadczenie3NIEZMIENILEM"] },
    { label: "Zasiłek opiekuńczy drugiego rodzica (TAK / NIE)", items: ["Page3.Dane2TAK", "Page3.Dane2NIE"] },
    { label: "Zasiłek opiekuńczy małżonka (TAK / NIE)", items: ["Page4.Dane2TAK", "Page4.Dane2NIE"] },
  ],
  "Z-12": [
    { label: "Sposób wypłaty – na rachunek albo na adres", items: ["Page4.Narachunek", "Page4.Naadres"] },
    { label: "Adres – zamieszkania albo do korespondencji (s. 4)", items: ["Page4.Zamieszkania", "Page4.Dokorespondencji"] },
    { label: "Adres – zamieszkania albo do korespondencji (s. 5)", items: ["Page5.Zamieszkania", "Page5.Dokorespondencji"] },
  ],
  "Z-3": [{ label: "Pierwszy wniosek albo kontynuacja", items: ["Page1.pierwszywniosek", "Page1.wniosekkontynuacja"] }],
  "Z-3a": [{ label: "Pierwszy wniosek albo kontynuacja", items: ["Page1.pierwszywniosek", "Page1.wniosekkontynuacja"] }],
};

/**
 * Pary TAK/NIE i „X” / „NieX” rozpoznawane automatycznie z nazw pól (każdy druk ZUS),
 * np. TAK_2 / NIE_2, Pobierala / Niepobierala2, Bylaobjeta / Niebylaobjeta.
 */
function genericPairs(names: string[]): { label: string; items: string[] }[] {
  const out: { label: string; items: string[] }[] = [];
  const byPage = (n: string) => n.split(".")[0];
  const base = (n: string) => n.split(".").slice(1).join(".");
  for (const a of names) {
    const b = base(a);
    const m = /^TAK(.*)$/i.exec(b);
    if (m) {
      const partner = names.find((x) => byPage(x) === byPage(a) && new RegExp(`^NIE${m[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i").test(base(x)));
      if (partner) out.push({ label: `Pytanie TAK/NIE (${b.replace(/^TAK_?/i, "") || "s. " + byPage(a).replace("Page", "")})`, items: [a, partner] });
    }
    const n = /^Nie(.+?)\d*$/.exec(b);
    if (n && !/^NIE/.test(b)) {
      const partner = names.find((x) => byPage(x) === byPage(a) && x !== a && base(x).replace(/\d+$/, "").toLowerCase() === n[1].toLowerCase());
      if (partner) out.push({ label: `Odpowiedź „${base(partner)}” / „${b}”`, items: [partner, a] });
    }
  }
  return out;
}

export interface CheckboxConflict {
  label: string;
  checked: string[];
}

/** Zaznaczenia, które się wykluczają (w tym puste rozwiązanie: zaznaczony podpunkt bez punktu głównego nie jest tu oceniany). */
export function findConflicts(form: OfficialFormId | null, values: Record<string, FieldValue>): CheckboxConflict[] {
  const checked = new Set(Object.entries(values).filter(([, v]) => v === true).map(([k]) => k));
  const all = Object.keys(values);
  const groups = [...(form ? (EXCLUSIVE[form] ?? []) : []), ...genericPairs(all)];
  const seen = new Set<string>();
  const out: CheckboxConflict[] = [];
  for (const g of groups) {
    const hits = g.items.filter((it) => (Array.isArray(it) ? it.some((x) => checked.has(x)) : checked.has(it)));
    if (hits.length < 2) continue;
    const names = hits.flatMap((it) => (Array.isArray(it) ? it.filter((x) => checked.has(x)) : [it]));
    const key = [...names].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: g.label, checked: names });
  }
  return out;
}

/** Etykieta pola do komunikatów. */
export function fieldLabel(form: OfficialFormId | null, name: string): string {
  const f = form ? OFFICIAL_FIELDS[form]?.find((x) => x.name === name) : undefined;
  return f?.label ?? name.split(".").slice(1).join(".");
}

/** Rozpoznanie druku po nazwach pól AcroForm. */
export function detectOfficialForm(names: string[]): OfficialFormId | null {
  const set = new Set(names);
  let best: { id: OfficialFormId; score: number } | null = null;
  for (const [id, fields] of Object.entries(OFFICIAL_FIELDS) as [OfficialFormId, OfficialField[]][]) {
    const score = fields.filter((f) => set.has(f.name)).length / fields.length;
    if (score > 0.6 && (!best || score > best.score)) best = { id, score };
  }
  if (best) return best.id;
  if (set.has("Page1.pierwszywniosek") && set.has("Page1.PESEL2")) return names.some((n) => /Przepracowal/.test(n)) ? "Z-3" : "Z-3a";
  return null;
}

/** Potok 1: wartości pól druku z danych aplikacji. */
export function fillValues(form: OfficialFormId, c: FormCtx): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of OFFICIAL_FIELDS[form] ?? []) {
    const v = f.fill?.(c);
    if (v === undefined || v === null || v === "") continue;
    out[f.name] = f.check ? Boolean(v) : String(v);
  }
  return out;
}

/** Porównanie znormalizowane: wielkość liter, spacje, myślniki i kropki nie mają znaczenia. */
export const sameValue = (a: FieldValue | undefined, b: FieldValue | undefined) => {
  if (typeof a === "boolean" || typeof b === "boolean") return Boolean(a) === Boolean(b);
  const n = (s?: string) => (s ?? "").toLocaleUpperCase("pl-PL").replace(/[\s.\-–,;:/]/g, "").replace(/^UL/, "");
  return n(a) === n(b);
};

export const OFFICIAL_FOR_DOC: Record<string, OfficialFormId> = { ZAM: "ZAM", "ZAM-TATA": "ZAM", "ZAS-53": "ZAS-53", "Z-15A": "Z-15", "Z-12": "Z-12", "NFZ-ZGLOSZENIE": "ZCNA", "Z-3": "Z-3", "Z-3a": "Z-3a", "ZUS-ZUA": "ZUA" };
export const todayIso = () => new Date().toISOString().slice(0, 10);
export { pad };

/* ------------------------------ potok 2: druk → ustandaryzowany dokument ------------------------------ */

const fromDate8 = (s: string) => {
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(s.replace(/\D/g, "")) ?? /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const periodOf = (s: string) => {
  const d = [...s.matchAll(/(\d{2})[.\-/](\d{2})[.\-/](\d{4})/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`);
  return { from: d[0] ?? null, to: d[1] ?? null };
};

/** Typ druku w ustandaryzowanym JSON (models/document). */
export const OFFICIAL_TO_FORMCODE: Record<OfficialFormId, string> = { ZAM: "ZAM", "ZAS-53": "ZAS-53", "Z-15": "Z-15A", "Z-12": "Z-12", ZCNA: "ZCNA", "Z-3": "Z-3", "Z-3a": "Z-3a", ZUA: "NIEZNANY" };

/** Przenosi wartości pól wypełnionego druku do dokumentu (wartości z pól mają pierwszeństwo przed parserem tekstu). Zwraca ścieżki uzupełnionych pól. */
export function applyFormFields(doc: Record<string, unknown> & { insured: Record<string, unknown>; payer: Record<string, unknown>; child: Record<string, unknown>; benefit: Record<string, unknown>; sickLeaves: { series: string | null; from: string; to: string; codeB: boolean }[] }, form: OfficialFormId, values: Record<string, FieldValue>): string[] {
  const set: string[] = [];
  const put = (path: string, v: unknown) => {
    if (v === null || v === undefined || v === "") return;
    const [a, b] = path.split(".");
    if (b) (doc[a] as Record<string, unknown>)[b] = v;
    else doc[a] = v;
    set.push(path);
  };
  const addr: string[] = [];
  const types: string[] = [];
  for (const f of OFFICIAL_FIELDS[form] ?? []) {
    const v = values[f.name];
    if (!f.read || v === undefined || v === "" || v === false) continue;
    const s = typeof v === "string" ? v.trim() : "";
    switch (f.read) {
      case "pesel": put("insured.pesel", s.replace(/\D/g, "")); break;
      case "firstName": put("insured.firstName", s); break;
      case "lastName": put("insured.lastName", s); break;
      case "nip": put("payer.nip", s.replace(/\D/g, "")); break;
      case "regon": put("payer.regon", s.replace(/\D/g, "")); break;
      case "payerName": put("payer.name", s); break;
      case "bank": put("bankAccount", s.replace(/\D/g, "")); break;
      case "dueDate": put("child.dueDate", fromDate8(s)); break;
      case "childBirth": put("child.birthDate", fromDate8(s)); break;
      case "childPesel": put("child.pesel", s.replace(/\D/g, "")); break;
      case "childFirst": put("child.firstName", s); break;
      case "childText": { const p = periodOf(s); put("child.birthDate", p.from); put("child.firstName", s.split(/[ ,]/)[0]); break; }
      case "signDate": put("signatureDate", fromDate8(s)); break;
      case "variant815": put("benefit.variant815", true); break;
      case "voluntaryYes": put("voluntarySickness", true); break;
      case "voluntaryNo": put("voluntarySickness", false); break;
      case "adoption": put("child.adoption", true); break;
      case "zaZyciem": put("child.zaZyciem", true); break;
      case "periodMat": case "periodPar": case "periodSup": case "periodPat": {
        const p = periodOf(s);
        types.push({ periodMat: "macierzyński", periodPar: "rodzicielski", periodSup: "uzupełniający", periodPat: "ojcowski" }[f.read]);
        if (!doc.benefit.from || (p.from && p.from < String(doc.benefit.from))) put("benefit.from", p.from);
        if (!doc.benefit.to || (p.to && p.to > String(doc.benefit.to))) put("benefit.to", p.to);
        break;
      }
      case "sickPeriod": { const p = periodOf(s); if (p.from && p.to) { doc.sickLeaves = [{ series: null, from: p.from, to: p.to, codeB: /KOD B|CIĄŻ/i.test(s) }]; set.push("sickLeaves"); } break; }
      case "street": case "house": case "postal": case "city": addr.push(s); break;
    }
  }
  if (types.length) put("benefit.type", types.join(" + "));
  if (form === "ZAS-53") put("benefit.type", "chorobowy");
  // na druku ZAM „Za życiem” to pole wyboru – brak zaznaczenia oznacza odpowiedź „nie”
  if (form === "ZAM" && doc.child.zaZyciem == null) doc.child.zaZyciem = false;
  if (addr.length) put("insured.address", addr.join(" "));
  return set;
}
