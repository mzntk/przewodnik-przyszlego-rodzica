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
export const fieldKey = (raw: string) => raw.replace(/^(topmostSubform|form1)\[\d+\]\./, "").replace(/\[0\]/g, "");

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
/** imiona dzieci (oświadczenie „Za życiem”) */
const kidNames = (c: FormCtx) => (c.d.child.kids ?? []).map((k) => up(k.fullName || k.name)).filter(Boolean).join(", ") || undefined;
/** ZAM pkt 1 (urodzenie / przyjęcie dziecka) – nie przy urodzeniu po ustaniu zatrudnienia (pkt 3) */
const point1 = (c: FormCtx) => (c.d.child.path !== "biologiczny" || !!c.d.child.birthDate) && !point3(c);
/** ZAM pkt 3 – urodzenie dziecka po ustaniu zatrudnienia (upadłość, likwidacja, bezprawne zwolnienie, śmierć pracodawcy) */
const point3 = (c: FormCtx) => c.who === "matka" && !!c.d.mother.employmentLossReason && c.d.child.path === "biologiczny" && !!c.d.child.birthDate;
/** ZAM pkt 4 – uzupełniający urlop macierzyński (składa matka) */
const sup = (c: FormCtx) => c.who === "matka" && c.r.leave.supplementaryWeeks > 0;
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
  /** lista rozwijana – wartość to początek opcji (np. „11” → „11 – dziecko własne…”) */
  select?: boolean;
  /** wartość z danych aplikacji (potok 1); undefined = zostaw puste */
  fill?: (c: FormCtx) => FieldValue | undefined;
  /** odczyt do ustandaryzowanego dokumentu (potok 2) */
  read?: FieldRead;
  /** maksymalna liczba znaków pola w druku (dłuższe wartości druk obcina) */
  max?: number;
  /** wartość zależy od dnia wypełnienia (np. data zgłoszenia) – nie porównujemy jej z danymi aplikacji */
  today?: boolean;
}
export type FieldRead =
  | "pesel" | "firstName" | "lastName" | "nip" | "regon" | "payerName" | "bank" | "street" | "house" | "postal" | "city"
  | "dueDate" | "childText" | "childPesel" | "childFirst" | "childLast" | "childBirth" | "adoptionDate" | "adoption" | "zaZyciem" | "hospPeriod"
  | "signDate" | "variant815" | "voluntaryYes" | "voluntaryNo"
  | "periodMat" | "periodPar" | "periodSup" | "periodPat" | "benefitMat" | "benefitPar" | "benefitSup" | "benefitPat" | "sickPeriod"
  | "insurancePeriod" | "insuranceFrom" | "insuranceEndDate" | "workTime" | "insuredUpTo20" | "insuredOver20" | "titleZlecenie" | "titleCode";

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
  { name: "Page2.macierzynskiego", label: "urlopu macierzyńskiego", section: "Zakres wniosku", check: true, read: "benefitMat", fill: (c) => c.who === "matka" && c.d.child.path === "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page2.nawarunkach", label: "urlopu na warunkach urlopu macierzyńskiego", section: "Zakres wniosku", check: true, read: "benefitMat", fill: (c) => c.who === "matka" && c.d.child.path !== "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page2.Okres", label: "Okres urlopu macierzyńskiego (od–do)", section: "Zakres wniosku", fill: (c) => (c.who === "matka" ? period(segs(c, (k) => k === "macierzynski")[0]?.from, segs(c, (k) => k === "macierzynski")[0]?.to) : undefined), read: "periodMat" },
  { name: "Page2.rodzicielskiego", label: "urlopu rodzicielskiego", section: "Zakres wniosku", check: true, read: "benefitPar", fill: (c) => segs(c, (k) => k.startsWith("rodzicielski")).length > 0 },
  { name: "Page2.Okres2", label: "Okres urlopu rodzicielskiego (od–do)", section: "Zakres wniosku", fill: (c) => { const p = segs(c, (k) => k.startsWith("rodzicielski")); return p.length ? period(p[0].from, p.at(-1)!.to) : undefined; }, read: "periodPar" },
  { name: "Page2.czesc", label: "Która to część urlopu rodzicielskiego", section: "Zakres wniosku", fill: (c) => (segs(c, (k) => k.startsWith("rodzicielski")).length ? "1" : undefined) },
  { name: "Page2.uzMacierzynskiego", label: "uzupełniającego urlopu macierzyńskiego", section: "Zakres wniosku", check: true, read: "benefitSup", fill: (c) => c.who === "matka" && segs(c, (k) => k === "uzupelniajacy").length > 0 },
  { name: "Page2.Okres3", label: "Okres uzupełniającego urlopu macierzyńskiego", section: "Zakres wniosku", fill: (c) => { const s = c.who === "matka" ? segs(c, (k) => k === "uzupelniajacy")[0] : undefined; return s ? period(s.from, s.to) : undefined; }, read: "periodSup" },
  { name: "Page2.ojcowskiego", label: "urlopu ojcowskiego", section: "Zakres wniosku", check: true, read: "benefitPat", fill: (c) => c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length > 0 },
  { name: "Page2.Okres4", label: "Okres urlopu ojcowskiego (od–do)", section: "Zakres wniosku", fill: (c) => { const p = c.who === "ojciec" ? segs(c, (k) => k === "ojcowski") : []; return p.length ? p.map((s) => period(s.from, s.to)).join("; ") : undefined; }, read: "periodPat" },
  { name: "Page2.Numerlokalu2", label: "Która to część urlopu ojcowskiego", section: "Zakres wniosku", fill: (c) => (c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length ? "1" : undefined) },
  { name: "Page2.Data2", label: "Data zakończenia zasiłku za urlop macierzyński", section: "Zakres wniosku", fill: (c) => { const m = segs(c, (k) => k === "macierzynski", "matka")[0]; return m && (segs(c, (k) => k.startsWith("rodzicielski")).length || segs(c, (k) => k === "uzupelniajacy").length) ? date8(m.to) : undefined; } },
  { name: "Page2.informuje", label: "Zamierzam skorzystać z pełnego wymiaru urlopów (81,5% za cały okres)", section: "Zakres wniosku", check: true, fill: (c) => c.who === "matka" && c.d.plan.variant === "combined", read: "variant815" },
  // ubezpieczenie (tylko działalność / współpraca / duchowni / marynarze)
  { name: "Page2.TAK", label: "Objęty ubezpieczeniem chorobowym (działalność) – TAK", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => (jdgTitle(applicant(c)) ? applicant(c).voluntarySickness : undefined), read: "voluntaryYes" },
  { name: "Page2.NIE", label: "Objęty ubezpieczeniem chorobowym (działalność) – NIE", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => (jdgTitle(applicant(c)) ? !applicant(c).voluntarySickness : undefined), read: "voluntaryNo" },
  // podstawa
  { name: "Page2.ZaznaczX1a", label: "1. urodzeniem dziecka/dzieci", section: "Wnioskuję w związku z", check: true, fill: (c) => !!c.d.child.birthDate && c.d.child.path === "biologiczny" && !point3(c) },
  { name: "Page2.ZaznaczX1b", label: "1. przyjęciem dziecka na wychowanie i wystąpieniem do sądu o przysposobienie", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.child.path === "adopcja", read: "adoption" },
  { name: "Page2.Data", label: "Data przyjęcia na wychowanie", section: "Wnioskuję w związku z", fill: (c) => (c.d.child.path !== "biologiczny" ? date8(c.d.child.birthDate ?? c.d.child.dueDate) : undefined), read: "adoptionDate" },
  { name: "Page2.ZaznaczX1c", label: "1. przyjęciem dziecka na wychowanie w ramach rodziny zastępczej", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.child.path === "rodzina_zastepcza", read: "adoption" },
  { name: "Page3.Tekst1", label: "Dane dziecka (imię, nazwisko, data i miejsce urodzenia)", section: "Wnioskuję w związku z", fill: (c) => (point1(c) ? kidsText(c) : undefined), read: "childText" },
  { name: "Page3.ZaznaczX1", label: "Dziecko ma zaświadczenie „Za życiem”", section: "Wnioskuję w związku z", check: true, fill: (c) => point1(c) && !!c.d.child.zaZyciem, read: "zaZyciem" },
  { name: "Page3.podajimie1", label: "Imię dziecka z zaświadczeniem „Za życiem”", section: "Wnioskuję w związku z", fill: (c) => (point1(c) && c.d.child.zaZyciem ? kidNames(c) : undefined) },
  { name: "Page3._2", label: "2. przewidywaną datą porodu", section: "Wnioskuję w związku z", check: true, fill: (c) => !c.d.child.birthDate && c.d.child.path === "biologiczny" },
  { name: "Page3.Data2a", label: "Przewidywana data porodu", section: "Wnioskuję w związku z", fill: (c) => (!c.d.child.birthDate && c.d.child.path === "biologiczny" ? date8(c.d.child.dueDate) : undefined), read: "dueDate" },
  { name: "Page3._3", label: "3. urodzeniem dziecka po ustaniu zatrudnienia", section: "Wnioskuję w związku z", check: true, fill: point3 },
  { name: "Page3.upadlosc", label: "pracodawca ogłosił upadłość", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "upadlosc" },
  { name: "Page3.likwidacje", label: "pracodawca ogłosił likwidację", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "likwidacja" },
  { name: "Page3.rozwiazal", label: "rozwiązanie umowy z naruszeniem prawa (wyrok)", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "bezprawne_zwolnienie" },
  { name: "Page3.zmarl", label: "pracodawca zmarł", section: "Wnioskuję w związku z", check: true, fill: (c) => c.d.mother.employmentLossReason === "smierc_pracodawcy" },
  { name: "Page3.Tekst13B", label: "Dane dziecka (pkt 3 – urodzenie po ustaniu zatrudnienia)", section: "Wnioskuję w związku z", fill: (c) => (point3(c) ? kidsText(c) : undefined), read: "childText" },
  { name: "Page3.ZaznaczX1d", label: "Dziecko ma zaświadczenie „Za życiem” (pkt 3)", section: "Wnioskuję w związku z", check: true, fill: (c) => point3(c) && !!c.d.child.zaZyciem, read: "zaZyciem" },
  { name: "Page3.podajimie", label: "Imię dziecka z zaświadczeniem „Za życiem” (pkt 3)", section: "Wnioskuję w związku z", fill: (c) => (point3(c) && c.d.child.zaZyciem ? kidNames(c) : undefined) },
  { name: "Page3._4", label: "4. urodzeniem dziecka i jego pobytem w szpitalu (uzupełniający)", section: "Urlop uzupełniający", check: true, fill: sup },
  { name: "Page3.skroceniem", label: "urodzenie przed ukończeniem 28. tygodnia ciąży", section: "Urlop uzupełniający", check: true, fill: (c) => sup(c) && (c.d.child.gestationWeek ?? 40) < 28 },
  { name: "Page3.przerwaniem4A", label: "masa urodzeniowa nie większa niż 1000 g", section: "Urlop uzupełniający", check: true, fill: (c) => sup(c) && (c.d.child.birthWeightsG ?? []).some((w) => w <= 1000) },
  { name: "Page3.przerwaniem4B", label: "urodzenie między 28. a 37. tygodniem i masa > 1000 g", section: "Urlop uzupełniający", check: true, fill: (c) => sup(c) && (c.d.child.gestationWeek ?? 40) >= 28 && (c.d.child.gestationWeek ?? 40) < 37 && !(c.d.child.birthWeightsG ?? []).some((w) => w <= 1000) },
  { name: "Page3.podjeciem", label: "urodzenie po 37. tygodniu i pobyt w szpitalu ≥ 2 dni (5.–28. dzień)", section: "Urlop uzupełniający", check: true, fill: (c) => sup(c) && (c.d.child.gestationWeek ?? 40) >= 37 },
  { name: "Page3.Tekst4a", label: "Okres pobytu dziecka w szpitalu", section: "Urlop uzupełniający", fill: (c) => { const ch = c.d.child; const days = ch.hospitalizationDays?.[0]; if (!(c.r.leave.supplementaryWeeks > 0) || !ch.birthDate || !days) return undefined; const start = new Date(Date.parse(ch.birthDate) + ((ch.hospitalizationStartDay ?? 1) - 1) * 86_400_000).toISOString().slice(0, 10); return period(start, new Date(Date.parse(start) + (days - 1) * 86_400_000).toISOString().slice(0, 10)); }, read: "hospPeriod" },
  // pole „Dane dziecka/dzieci” pkt 4 jest na górze strony 4 (Page4.Tekst13 to „Dane matki” z pkt 5–6)
  { name: "Page4.Tekst4c", label: "Dane dziecka (urlop uzupełniający)", section: "Urlop uzupełniający", fill: (c) => (c.who === "matka" && c.r.leave.supplementaryWeeks > 0 ? kidsText(c) : undefined), read: "childText" },
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
  // w druku Z-15 pole „pokrewienstwo” leży w wierszu „Nazwisko”, a pole „Nazwisko” – w wierszu „Stopień pokrewieństwa”
  { name: "Page2.pokrewienstwo", label: "Nazwisko dziecka", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => up(child0(c)?.lastName || c.d.mother.lastName), read: "childLast" },
  { name: "Page2.Dataurodzenia", label: "Data urodzenia dziecka (gdy brak PESEL)", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => (!child0(c)?.pesel ? date8(c.d.child.birthDate) : undefined), read: "childBirth" },
  { name: "Page2.Nazwisko", label: "Stopień pokrewieństwa", section: "Osoba, nad którą sprawujesz opiekę", fill: (c) => (c.d.care?.enabled || child0(c)?.pesel ? "DZIECKO" : undefined) },
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
  { name: "Page1.Kodpokrewienstwa_lista", label: "Stopień pokrewieństwa osoby zmarłej", section: "Dane osoby zmarłej", select: true, fill: (c) => (c.d.child.stillbirth || c.d.child.childDeathDate ? "dziecko własne" : undefined) },
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
  { name: "Page5.AktualnaData", label: "Data wypełnienia", section: "Podpis", fill: (c) => date8(c.today), read: "signDate" },
];

const ZCNA_FIELDS: OfficialField[] = [
  { name: "Page1.II01_NrNIP", label: "NIP płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.nip, read: "nip" },
  { name: "Page1.II02_NrREGON", label: "REGON płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.regon, read: "regon" },
  { name: "Page1.II06_NazwaSkrocona", label: "Nazwa skrócona płatnika", section: "Dane płatnika", fill: (c) => up(payerOf(applicant(c))?.name), read: "payerName" },
  { name: "Page1.III01_NrPESEL", label: "PESEL ubezpieczonego (rodzica)", section: "Dane ubezpieczonego", fill: (c) => applicant(c).pesel, read: "pesel" },
  { name: "Page1.III05_Nazwisko", label: "Nazwisko ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => up(applicant(c).lastName), read: "lastName" },
  { name: "Page1.III06_Imie", label: "Imię ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => up(applicant(c).firstName), read: "firstName" },
  { name: "Page1.III07_DataUrodzenia", label: "Data urodzenia ubezpieczonego", section: "Dane ubezpieczonego", fill: (c) => date8(applicant(c).birthDate) },
  { name: "Page1.IV01A_zgloszenie", label: "Rodzaj: 1 – zgłoszenie, 2 – zmiana danych", section: "Członek rodziny – dziecko", select: true, fill: () => "1" },
  { name: "Page1.IV02A_DataUrodzenia", label: "Data uzyskania uprawnień do ubezpieczenia zdrowotnego", section: "Członek rodziny – dziecko", today: true, fill: (c) => date8(c.today) },
  { name: "Page1.IV10A", label: "Stopień pokrewieństwa (kod)", section: "Członek rodziny – dziecko", select: true, fill: (c) => (c.d.child.path === "rodzina_zastepcza" ? "21" : "11") },
  { name: "Page1.IV12A", label: "Niepełnosprawność (kod)", section: "Członek rodziny – dziecko", select: true, fill: () => "0" },
  { name: "Page1.IV03A_NrPESEL", label: "PESEL dziecka", section: "Członek rodziny – dziecko", fill: (c) => child0(c)?.pesel, read: "childPesel" },
  { name: "Page1.IV07A_Nazwisko", label: "Nazwisko dziecka", section: "Członek rodziny – dziecko", fill: (c) => (c.d.child.birthDate ? up(child0(c)?.lastName || applicant(c).lastName) : undefined), read: "childLast" },
  { name: "Page1.IV08A_Imie", label: "Imię dziecka", section: "Członek rodziny – dziecko", fill: (c) => (c.d.child.birthDate ? up(child0(c)?.fullName || child0(c)?.name) : undefined), read: "childFirst" },
  { name: "Page1.IV09A_DataUrodzenia", label: "Data urodzenia dziecka", section: "Członek rodziny – dziecko", fill: (c) => date8(c.d.child.birthDate), read: "childBirth" },
  { name: "Page1.IV11A", label: "Wspólne gospodarstwo domowe z ubezpieczonym", section: "Członek rodziny – dziecko", check: true, fill: () => true },
  { name: "Page1.IV01B_kodpocztowy", label: "Kod pocztowy", section: "Adres dziecka", fill: (c) => postal6(applicant(c).address?.postalCode) },
  { name: "Page1.IV02B_miejscowosc", label: "Miejscowość", section: "Adres dziecka", fill: (c) => up(applicant(c).address?.city) },
  { name: "Page1.IV03B_gmina", label: "Gmina / dzielnica", section: "Adres dziecka", fill: (c) => up(applicant(c).address?.commune ?? applicant(c).address?.city) },
  { name: "Page1.IV04B_ulica", label: "Ulica", section: "Adres dziecka", fill: (c) => street(applicant(c).address) },
  { name: "Page1.IV05B_nrdomu", label: "Numer domu", section: "Adres dziecka", fill: (c) => applicant(c).address?.house },
  { name: "Page1.IV06B_nrlokalu", label: "Numer lokalu", section: "Adres dziecka", fill: (c) => applicant(c).address?.flat },
  { name: "Page1.IV07B_nrtelefonu", label: "Telefon", section: "Adres dziecka", fill: (c) => applicant(c).phone?.replace(/\s/g, "") },
  { name: "Page2.VI01_DataWypelnienia", label: "Data wypełnienia", section: "Oświadczenie", fill: (c) => date8(c.today), read: "signDate" },
];


/* ------------------------------ druki płatnika: Z-3, Z-3a, ZUS ZUA ------------------------------ */

/** wymiar etatu słownie – i z powrotem (odczyt druku) */
const etat = (f: number) => (f === 1 ? "PEŁNY ETAT" : f === 0.5 ? "1/2 ETATU" : f === 0.75 ? "3/4 ETATU" : f === 0.25 ? "1/4 ETATU" : `${String(f).replace(".", ",")} ETATU`);
const parseEtat = (s: string) => {
  if (/pełn/i.test(s)) return 1;
  const fr = /(\d+)\s*\/\s*(\d+)/.exec(s);
  if (fr && +fr[2]) return +fr[1] / +fr[2];
  const n = Number((/\d+(?:[.,]\d+)?/.exec(s)?.[0] ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
};
/** kod pocztowy w polach KEDU (ZUA, ZCNA): „dwie cyfry, spacja, trzy cyfry” */
const postal6 = (p?: string) => (p ? p.replace(/^(\d{2})-?(\d{3})$/, "$1 $2") : undefined);
const fmtZl = (n?: number) => (n || n === 0 ? n.toFixed(2).replace(".", ",") : "");
/** 12 pełnych miesięcy przed miesiącem powstania prawa (porodu albo dziś). */
function last12(c: FormCtx) {
  const p = applicant(c);
  const event = (c.d.child.birthDate ?? c.d.child.dueDate ?? c.today).slice(0, 7);
  return [...p.incomeHistory].filter((m) => m.month < event).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}
const payerAddr = (c: FormCtx) => payerOf(applicant(c))?.address;
const payerBlock = (section: string): OfficialField[] => [
  { name: "Page1.pierwszywniosek", label: "Pierwszy wniosek o świadczenie", section: "Rodzaj zaświadczenia", check: true, fill: () => true },
  { name: "Page1.wniosekkontynuacja", label: "Wniosek o kontynuację świadczenia", section: "Rodzaj zaświadczenia", check: true },
  { name: "Page1.NIP", label: "NIP płatnika", section, fill: (c) => payerOf(applicant(c))?.nip, read: "nip" },
  { name: "Page1.REGON", label: "REGON płatnika", section, fill: (c) => payerOf(applicant(c))?.regon, read: "regon" },
  { name: "Page1.Nazwaplatnika", label: "Nazwa płatnika", section, fill: (c) => up(payerOf(applicant(c))?.name), read: "payerName" },
  { name: "Page1.Ulica", label: "Ulica (płatnik)", section, fill: (c) => street(payerAddr(c)) },
  { name: "Page1.Numerdomu", label: "Numer domu (płatnik)", section, fill: (c) => payerAddr(c)?.house },
  { name: "Page1.Numerlokalu", label: "Numer lokalu (płatnik)", section, fill: (c) => payerAddr(c)?.flat },
  { name: "Page1.Kodpocztowy", label: "Kod pocztowy (płatnik)", section, fill: (c) => payerAddr(c)?.postalCode },
  { name: "Page1.Poczta", label: "Miejscowość (płatnik)", section, fill: (c) => up(payerAddr(c)?.city) },
  { name: "Page1.Numertelefonu", label: "Telefon płatnika", section, fill: (c) => applicant(c).payer?.phone },
];
const insuredBlock = (section: string): OfficialField[] => [
  { name: "Page1.PESEL2", label: "PESEL", section, fill: (c) => applicant(c).pesel, read: "pesel" },
  { name: "Page1.Imie", label: "Imię", section, fill: (c) => up(applicant(c).firstName), read: "firstName" },
  { name: "Page1.Nazwisko", label: "Nazwisko", section, fill: (c) => up(applicant(c).lastName), read: "lastName" },
  { name: "Page2.Ulica2", label: "Ulica", section, fill: (c) => street(applicant(c).address), read: "street" },
  { name: "Page2.Numerdomu2", label: "Numer domu", section, fill: (c) => applicant(c).address?.house, read: "house" },
  { name: "Page2.Numerlokalu2", label: "Numer lokalu", section, fill: (c) => applicant(c).address?.flat },
  { name: "Page2.Kodpocztowy2", label: "Kod pocztowy", section, fill: (c) => applicant(c).address?.postalCode, read: "postal" },
  { name: "Page2.Poczta2", label: "Miejscowość", section, fill: (c) => up(applicant(c).address?.city), read: "city" },
  { name: "Page2.Numerrachunku", label: "Rachunek bankowy", section: "Rachunek bankowy", fill: (c) => applicant(c).bankAccount?.replace(/\D/g, ""), read: "bank" },
];
const benefitPeriod = (c: FormCtx) => { const s = segs(c, (k) => k !== "wynagrodzenie_chorobowe" && k !== "chorobowy"); return s.length ? period(s[0].from, s.at(-1)!.to) : undefined; };
const sickText = (c: FormCtx) => applicant(c).sickLeaves.map((l) => `${period(l.from, l.to)}${l.codeB ? " (B)" : ""}`).join("; ") || undefined;
const otherParentText = (c: FormCtx) => { const o = other(c); return o ? up(`${o.firstName} ${o.lastName}, PESEL ${o.pesel}`) : undefined; };
const childFull = (c: FormCtx) => (c.d.child.birthDate ? (c.d.child.kids ?? [{}]).map((k) => [kidName(k, applicant(c).lastName), k.pesel ? `PESEL ${k.pesel}` : "", `UR. ${dDots(c.d.child.birthDate)}`, up(k.birthPlace)].filter(Boolean).join(", ")).join("; ") : undefined);

/** Kolejność wierszy tabeli Z-3 na stronie 4 (numeracja pól w PDF nie idzie z góry na dół). */
const Z3_ROW_ORDER = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];
function z3Rows(c: FormCtx): Record<string, string> {
  const out: Record<string, string> = {};
  last12(c).forEach((m, row) => {
    const i = Z3_ROW_ORDER[row];
    const base = i * 5;
    out[`Page4.ROK${i ? `[${i}]` : ""}`] = m.month.slice(0, 4);
    out[`Page4.Miesiac${base ? `[${base}]` : ""}`] = m.month.slice(5, 7);
    out[`Page4.Miesiac[${base + 1}]`] = String(m.workedDays ?? m.requiredDays ?? 21);
    out[`Page4.Przepracowal${i ? `[${i}]` : ""}`] = String(m.requiredDays ?? m.workedDays ?? 21);
    if ((m.workedDays ?? 0) < (m.requiredDays ?? 0)) out[`Page4.Liczbadni${i ? `[${i}]` : ""}`] = "NIEOBECNOŚĆ – UZUPEŁNIJ PRZYCZYNĘ";
    out[`Page4.Podstawawymiaru${i ? `[${i}]` : ""}`] = fmtZl(m.fixedContract ?? m.gross);
    out[`Page4.Miesiac[${base + 2}]`] = m.fixedContract && m.gross !== m.fixedContract ? fmtZl(m.gross) : "";
    out[`Page4.Miesiac[${base + 4}]`] = "13,71";
  });
  return out;
}
function z3aRows(c: FormCtx): Record<string, string> {
  const out: Record<string, string> = {};
  last12(c).forEach((m, i) => {
    const k = i ? `[${i}]` : "";
    out[`Page5.ROK${k}`] = m.month.slice(0, 4);
    out[`Page5.Miesiac${k}`] = m.month.slice(5, 7);
    if (m.workedDays) out[`Page5.Przepracowal${k}`] = String(m.workedDays);
    if (m.requiredDays) out[`Page5.Liczbadni${k}`] = String(m.requiredDays);
    out[`Page5.Podstawawymiaru${k}`] = fmtZl(m.gross);
  });
  return out;
}
/** Pola tabeli miesięcznej: jedno „wirtualne” pole w podglądzie, rozwijane do kolumn przy wypełnianiu PDF. */
const tableField = (name: string, rows: (c: FormCtx) => Record<string, string>): OfficialField => ({ name, label: "Wynagrodzenie / przychód z 12 miesięcy (tabela)", section: "Składniki wynagrodzenia (12 mies.)", fill: (c) => Object.keys(rows(c)).length ? JSON.stringify(rows(c)) : undefined });

const Z3_FIELDS: OfficialField[] = [
  ...payerBlock("Dane płatnika składek"),
  ...insuredBlock("Dane pracownika"),
  { name: "Page2._1", label: "zasiłek chorobowy", section: "Pracownik występuje o", check: true, fill: (c) => applicant(c).sickLeaves.length > 0 },
  { name: "Page2.Tekst", label: "Okres zasiłku chorobowego", section: "Pracownik występuje o", fill: sickText, read: "sickPeriod" },
  { name: "Page2._3", label: "zasiłek macierzyński", section: "Pracownik występuje o", check: true, read: "benefitMat", fill: (c) => !!benefitPeriod(c) },
  { name: "Page2.Tekstzm", label: "Okres zasiłku macierzyńskiego", section: "Pracownik występuje o", fill: benefitPeriod, read: "periodMat" },
  { name: "Page3.UCHpodlega", label: "Okres zatrudnienia (od / od–do)", section: "Informacje o pracowniku", fill: (c) => { const p = applicant(c); return p.contractEndDate ? period(p.insuranceStart, p.contractEndDate) : `OD ${dDots(p.insuranceStart)}`; }, read: "insurancePeriod" },
  { name: "Page3.UZpodlega", label: "Wymiar czasu pracy", section: "Informacje o pracowniku", fill: (c) => etat(applicant(c).workTimeFraction), read: "workTime" },
  { name: "Page3.Podajdate", label: "Od kiedy w tym wymiarze", section: "Informacje o pracowniku", fill: (c) => date8(applicant(c).insuranceStart) },
  { name: "Page3.TAK_2", label: "Umowa o pracę tymczasową – TAK", section: "Informacje o pracowniku", check: true },
  { name: "Page3.NIE_2", label: "Umowa o pracę tymczasową – NIE", section: "Informacje o pracowniku", check: true, fill: () => true },
  { name: "Page3.TAK_3", label: "Praca za granicą – TAK", section: "Informacje o pracowniku", check: true },
  { name: "Page3.NIE_3", label: "Praca za granicą – NIE", section: "Informacje o pracowniku", check: true, fill: () => true },
  { name: "Page3.TAK_5", label: "Urlop bezpłatny / wychowawczy / areszt w okresie niezdolności – TAK", section: "Informacje o pracowniku", check: true },
  { name: "Page3.NIE_5", label: "Urlop bezpłatny / wychowawczy / areszt w okresie niezdolności – NIE", section: "Informacje o pracowniku", check: true, fill: () => true },
  { name: "Page3.A6", read: "benefitMat", label: "Udzielono urlopu macierzyńskiego", section: "Urlopy (zasiłek macierzyński)", check: true, fill: (c) => c.who === "matka" && c.d.child.path === "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page3.B6", read: "benefitPar", label: "Udzielono urlopu rodzicielskiego", section: "Urlopy (zasiłek macierzyński)", check: true, fill: (c) => segs(c, (k) => k.startsWith("rodzicielski")).length > 0 },
  { name: "Page3.C6", read: "benefitMat", label: "Udzielono urlopu na warunkach urlopu macierzyńskiego", section: "Urlopy (zasiłek macierzyński)", check: true, fill: (c) => c.d.child.path !== "biologiczny" && segs(c, (k) => k === "macierzynski").length > 0 },
  { name: "Page3.D6", read: "benefitSup", label: "Udzielono uzupełniającego urlopu macierzyńskiego", section: "Urlopy (zasiłek macierzyński)", check: true, fill: (c) => segs(c, (k) => k === "uzupelniajacy").length > 0 },
  { name: "Page3.E6", read: "benefitPat", label: "Udzielono urlopu ojcowskiego", section: "Urlopy (zasiłek macierzyński)", check: true, fill: (c) => c.who === "ojciec" && segs(c, (k) => k === "ojcowski").length > 0 },
  { name: "Page3.NIE6", label: "NIE – zasiłek po ustaniu zatrudnienia", section: "Urlopy (zasiłek macierzyński)", check: true },
  { name: "Page3.Tekst6", label: "Okresy urlopów, data wniosku, stawka", section: "Urlopy (zasiłek macierzyński)", fill: (c) => segs(c, (k) => !["wynagrodzenie_chorobowe", "chorobowy"].includes(k)).map((s) => `${up(s.label)}: ${period(s.from, s.to)}, ${Math.round(s.rate * 1000) / 10}%`).join("; ") || undefined },
  { name: "Page3.Tekst1", label: "Dane dziecka (imię, nazwisko, PESEL, data i miejsce urodzenia)", section: "Urlopy (zasiłek macierzyński)", fill: childFull, read: "childText" },
  { name: "Page3.Tekst2", label: "Dane drugiego rodzica", section: "Urlopy (zasiłek macierzyński)", fill: otherParentText },
  { name: "Page4.TAK_7", label: "Praca w czasie urlopu rodzicielskiego – TAK", section: "Informacje o pracowniku", check: true, fill: (c) => c.d.plan.combineWithWork.enabled && c.d.plan.combineWithWork.who === c.who },
  { name: "Page4.NIE_7", label: "Praca w czasie urlopu rodzicielskiego – NIE", section: "Informacje o pracowniku", check: true, fill: (c) => !(c.d.plan.combineWithWork.enabled && c.d.plan.combineWithWork.who === c.who) },
  { name: "Page4.Tekst7", label: "Okres i wymiar pracy w czasie urlopu rodzicielskiego", section: "Informacje o pracowniku", fill: (c) => { const w = c.r.segments.find((x) => x.kind === "rodzicielski_praca"); return c.d.plan.combineWithWork.enabled && c.d.plan.combineWithWork.who === c.who && w ? `${period(w.from, w.to)}, ${Math.round(c.d.plan.combineWithWork.fraction * 100)}% ETATU` : undefined; } },
  { name: "Page4.TAK_PI", label: "Do 20 ubezpieczonych zgłoszonych do ubezpieczenia chorobowego", section: "Pozostałe informacje", check: true, read: "insuredUpTo20", fill: (c) => (applicant(c).payer?.insuredCount ?? 0) <= 20 },
  { name: "Page4.NIE_PI", label: "Powyżej 20 ubezpieczonych", section: "Pozostałe informacje", check: true, read: "insuredOver20", fill: (c) => (applicant(c).payer?.insuredCount ?? 0) > 20 },
  tableField("@table-z3", z3Rows),
  { name: "Page6.Data", label: "Data wystawienia", section: "Podpis płatnika", fill: (c) => date8(c.today), read: "signDate" },
];

const Z3A_TITLE: Record<string, string> = { zlecenie: "Page3.ZaznaczX2", student_zlecenie: "Page3.ZaznaczX2" };
/** Tytuły ubezpieczenia w Z-3a – kolejność pól ZaznaczX1…X11 jak w druku ZUS */
const Z3A_TITLES = ["członek rolniczej spółdzielni produkcyjnej / kółek rolniczych", "umowa agencyjna, zlecenia lub o świadczenie usług", "umowa o pracę nakładczą", "praca w czasie odbywania kary pozbawienia wolności", "poseł lub senator pobierający uposażenie", "stypendium sportowe", "słuchacz KSAP pobierający stypendium", "stypendium w okresie szkolenia, stażu (urząd pracy)", "służba zastępcza", "umowa uaktywniająca (opieka nad dzieckiem)", "doktorant ze stypendium doktoranckim"];
const Z3A_FIELDS: OfficialField[] = [
  ...payerBlock("Dane płatnika składek"),
  ...insuredBlock("Dane ubezpieczonego"),
  { name: "Page2._1", label: "zasiłek chorobowy", section: "Ubezpieczony występuje o", check: true, fill: (c) => applicant(c).sickLeaves.length > 0 },
  { name: "Page2.Tekst", label: "Okres zasiłku chorobowego", section: "Ubezpieczony występuje o", fill: sickText, read: "sickPeriod" },
  { name: "Page2._3", label: "zasiłek macierzyński", section: "Ubezpieczony występuje o", check: true, read: "benefitMat", fill: (c) => !!benefitPeriod(c) },
  { name: "Page2.Tekstzm", label: "Okres zasiłku macierzyńskiego", section: "Ubezpieczony występuje o", fill: benefitPeriod, read: "periodMat" },
  { name: "Page2.Data", label: "Data złożenia wniosku o zasiłek macierzyński", section: "Ubezpieczony występuje o", today: true, fill: (c) => (benefitPeriod(c) ? date8(c.today) : undefined) },
  { name: "Page2.Dane_tekst", label: "Dane dziecka (imię, nazwisko, PESEL, data i miejsce urodzenia)", section: "Ubezpieczony występuje o", fill: childFull, read: "childText" },
  { name: "Page3.dane_2tekst", label: "Dane drugiego rodzica", section: "Ubezpieczony występuje o", fill: otherParentText },
  { name: "Page3.Informacje1A", label: "Ubezpieczenie chorobowe – TAK", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => applicant(c).voluntarySickness, read: "voluntaryYes" },
  { name: "Page3.Informacje1B", label: "Ubezpieczenie chorobowe – NIE", section: "Informacje o ubezpieczeniu", check: true, fill: (c) => !applicant(c).voluntarySickness, read: "voluntaryNo" },
  { name: "Page3.Informacje1C", label: "Ubezpieczenie wypadkowe – TAK", section: "Informacje o ubezpieczeniu", check: true, fill: () => true },
  { name: "Page3.Informacje1D", label: "Ubezpieczenie wypadkowe – NIE", section: "Informacje o ubezpieczeniu", check: true },
  ...Array.from({ length: 11 }, (_, i): OfficialField => ({ name: `Page3.ZaznaczX${i + 1}`, label: Z3A_TITLES[i], section: "Tytuł ubezpieczenia", check: true, read: i === 1 ? "titleZlecenie" : undefined, fill: (c) => Z3A_TITLE[applicant(c).title] === `Page3.ZaznaczX${i + 1}` })),
  { name: "Page3.UCHpodlega", label: "Ubezpieczeniu chorobowemu podlega (od / od–do)", section: "Informacje o ubezpieczonym", fill: (c) => (applicant(c).voluntarySickness ? (applicant(c).contractEndDate ? period(applicant(c).insuranceStart, applicant(c).contractEndDate) : `OD ${dDots(applicant(c).insuranceStart)}`) : undefined), read: "insurancePeriod" },
  { name: "Page3.UZpodlega", label: "Ubezpieczeniu wypadkowemu podlega (od / od–do)", section: "Informacje o ubezpieczonym", fill: (c) => `OD ${dDots(applicant(c).insuranceStart)}` },
  { name: "Page3.Informacje3TAK", label: "Tytuł ubezpieczenia ustał – TAK", section: "Informacje o ubezpieczonym", check: true, fill: (c) => !!applicant(c).contractEndDate && applicant(c).contractEndDate! < c.today },
  { name: "Page3.Informacje3NIE", label: "Tytuł ubezpieczenia ustał – NIE", section: "Informacje o ubezpieczonym", check: true, fill: (c) => !(applicant(c).contractEndDate && applicant(c).contractEndDate! < c.today) },
  { name: "Page3.Data3", label: "Data ustania tytułu", section: "Informacje o ubezpieczonym", read: "insuranceEndDate", fill: (c) => (applicant(c).contractEndDate && applicant(c).contractEndDate! < c.today ? date8(applicant(c).contractEndDate) : undefined) },
  { name: "Page4.Informacje5TAK", label: "Urlop bezpłatny / wychowawczy / areszt – TAK", section: "Informacje o ubezpieczonym", check: true },
  { name: "Page4.Informacje5NIE", label: "Urlop bezpłatny / wychowawczy / areszt – NIE", section: "Informacje o ubezpieczonym", check: true, fill: () => true },
  { name: "Page4.PozostaleA", label: "Do 20 ubezpieczonych zgłoszonych do ubezpieczenia chorobowego", section: "Pozostałe informacje", check: true, read: "insuredUpTo20", fill: (c) => (applicant(c).payer?.insuredCount ?? 0) <= 20 },
  { name: "Page4.PozostaleB", label: "Powyżej 20 ubezpieczonych", section: "Pozostałe informacje", check: true, read: "insuredOver20", fill: (c) => (applicant(c).payer?.insuredCount ?? 0) > 20 },
  tableField("@table-z3a", z3aRows),
  { name: "Page5.Data", label: "Data wystawienia", section: "Podpis płatnika", fill: (c) => date8(c.today), read: "signDate" },
];

const NFZ_BY_CITY: Record<string, string> = { Wrocław: "01R", Toruń: "02R", Lublin: "03R", Łódź: "05R", Kraków: "06R", Warszawa: "07R", Rzeszów: "09R", Białystok: "10R", Gdańsk: "11R", Katowice: "12R", Olsztyn: "14R", Poznań: "15R" };
const ZUA_TITLE: Partial<Record<string, string>> = { uop: "01 10", zlecenie: "04 11", jdg: "05 10", jdg_preferencyjna: "05 70", maly_zus_plus: "05 90" };
const ZUA_FIELDS: OfficialField[] = [
  { name: "Page1.I02zgloszenie", label: "Zmiana (1) / korekta (2) danych – przy pierwszym zgłoszeniu puste", section: "Zgłoszenie", select: true },
  { name: "Page1.II01_NrNIP", label: "NIP płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.nip, read: "nip" },
  { name: "Page1.II02_NrREGON", label: "REGON płatnika", section: "Dane płatnika", fill: (c) => payerOf(applicant(c))?.regon, read: "regon" },
  { name: "Page1.II06_NazwaSkrocona", label: "Nazwa skrócona płatnika", section: "Dane płatnika", fill: (c) => up(payerOf(applicant(c))?.name).slice(0, 31), read: "payerName" },
  { name: "Page1.III01_NrPESEL", label: "PESEL", section: "Osoba zgłaszana", fill: (c) => applicant(c).pesel, read: "pesel" },
  { name: "Page1.III05_Nazwisko", label: "Nazwisko", section: "Osoba zgłaszana", fill: (c) => up(applicant(c).lastName), read: "lastName" },
  { name: "Page1.III06_Imie", label: "Imię", section: "Osoba zgłaszana", fill: (c) => up(applicant(c).firstName), read: "firstName" },
  { name: "Page1.III07_DataUrodzenia", label: "Data urodzenia", section: "Osoba zgłaszana", fill: (c) => date8(applicant(c).birthDate) },
  { name: "Page1.IV04_PLEC", label: "Płeć", section: "Osoba zgłaszana", select: true, fill: (c) => (c.who === "ojciec" ? "M" : "K") },
  { name: "Page1.V01a", label: "Kod tytułu ubezpieczenia", section: "Tytuł ubezpieczenia", select: true, fill: (c) => ZUA_TITLE[applicant(c).title], read: "titleCode" },
  { name: "Page1.V01b", label: "Prawo do emerytury lub renty", section: "Tytuł ubezpieczenia", select: true, fill: () => "0" },
  { name: "Page1.V01c", label: "Stopień niepełnosprawności", section: "Tytuł ubezpieczenia", select: true, fill: () => "0" },
  { name: "Page1.VI01_DataPowstania", label: "Data powstania obowiązku ubezpieczeń społecznych", section: "Ubezpieczenia społeczne", fill: (c) => date8(applicant(c).insuranceStart), read: "insuranceFrom" },
  { name: "Page1.VI02", label: "Ubezpieczenie emerytalne", section: "Ubezpieczenia społeczne", check: true, fill: () => true },
  { name: "Page1.VI03", label: "Ubezpieczenie rentowe", section: "Ubezpieczenia społeczne", check: true, fill: () => true },
  { name: "Page1.VI04", label: "Ubezpieczenie chorobowe", section: "Ubezpieczenia społeczne", check: true, fill: (c) => applicant(c).title === "uop" || applicant(c).voluntarySickness, read: "voluntaryYes" },
  { name: "Page1.VI05", label: "Ubezpieczenie wypadkowe", section: "Ubezpieczenia społeczne", check: true, fill: () => true },
  { name: "Page1.VII01_DataPowstania", label: "Data powstania obowiązku ubezpieczenia zdrowotnego", section: "Ubezpieczenie zdrowotne", fill: (c) => date8(applicant(c).insuranceStart) },
  { name: "Page1.VII02", label: "Oddział NFZ", section: "Ubezpieczenie zdrowotne", select: true, fill: (c) => NFZ_BY_CITY[applicant(c).address?.city ?? ""] },
  { name: "Page2.XI01_kodpocztowy", label: "Kod pocztowy (zamieszkanie)", section: "Adres zamieszkania", fill: (c) => postal6(applicant(c).address?.postalCode), read: "postal" },
  { name: "Page2.XI02_miejscowosc", label: "Miejscowość", section: "Adres zamieszkania", fill: (c) => up(applicant(c).address?.city), read: "city" },
  { name: "Page2.XI03_gmina", label: "Gmina / dzielnica", section: "Adres zamieszkania", fill: (c) => up(applicant(c).address?.commune ?? applicant(c).address?.city) },
  { name: "Page2.XI04_ulica", label: "Ulica", section: "Adres zamieszkania", fill: (c) => street(applicant(c).address), read: "street" },
  { name: "Page2.XI05_nrdomu", label: "Numer domu", section: "Adres zamieszkania", fill: (c) => applicant(c).address?.house, read: "house" },
  { name: "Page2.XI06_nrlokalu", label: "Numer lokalu", section: "Adres zamieszkania", fill: (c) => applicant(c).address?.flat },
  { name: "Page2.XI07_nrtelefonu", label: "Telefon", section: "Adres zamieszkania", fill: (c) => applicant(c).phone?.replace(/\s/g, "") },
  { name: "Page2.XIII09_mail", label: "E-mail", section: "Adres do korespondencji", fill: (c) => applicant(c).email },
  { name: "Page2.XIV01_DataWypelnienia", label: "Data wypełnienia", section: "Oświadczenie", fill: (c) => date8(c.today), read: "signDate" },
];

/** Limity znaków pól KEDU (ZUA, ZCNA) – wartość dłuższą druk by obciął, więc obcinamy ją już przy wypełnianiu (podgląd = PDF). */
const MAX_LEN: Record<string, number> = {
  "Page1.II06_NazwaSkrocona": 31, "Page1.III05_Nazwisko": 31, "Page1.III06_Imie": 22, "Page1.IV07A_Nazwisko": 31, "Page1.IV08A_Imie": 22,
  "Page1.IV02B_miejscowosc": 26, "Page1.IV03B_gmina": 26, "Page1.IV04B_ulica": 30, "Page1.IV05B_nrdomu": 7, "Page1.IV06B_nrlokalu": 7, "Page1.IV07B_nrtelefonu": 12, "Page1.IV01B_kodpocztowy": 6,
  "Page2.XI01_kodpocztowy": 6, "Page2.XI02_miejscowosc": 26, "Page2.XI03_gmina": 26, "Page2.XI04_ulica": 30, "Page2.XI05_nrdomu": 7, "Page2.XI06_nrlokalu": 7, "Page2.XI07_nrtelefonu": 12, "Page2.XIII09_mail": 30,
};
for (const f of [...ZCNA_FIELDS, ...ZUA_FIELDS]) if (MAX_LEN[f.name]) f.max = MAX_LEN[f.name];

export const OFFICIAL_FIELDS: Partial<Record<OfficialFormId, OfficialField[]>> = { ZAM: ZAM_FIELDS, "ZAS-53": ZAS53_FIELDS, "Z-15": Z15_FIELDS, "Z-12": Z12_FIELDS, ZCNA: ZCNA_FIELDS, "Z-3": Z3_FIELDS, "Z-3a": Z3A_FIELDS, ZUA: ZUA_FIELDS };

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
    { label: "Wypłata zakładowi pogrzebowemu – w całości albo w części", items: ["Page5.Zamieszkania", "Page5.Dokorespondencji"] },
    { label: "Osoba zmarła była / nie była członkiem rodziny", items: ["Page1.Bylaczlonkiem", "Page1.Niebylaczlonkiem"] },
    { label: "Koszty pogrzebu – w całości albo w części", items: ["Page3.Pokrylem", "Page3.Niepokrylem"] },
  ],
  "Z-3": [
    { label: "Pierwszy wniosek albo kontynuacja", items: ["Page1.pierwszywniosek", "Page1.wniosekkontynuacja"] },
    { label: "Udzielone urlopy – „NIE (po ustaniu zatrudnienia)” wyklucza pozostałe", items: [["Page3.A6", "Page3.B6", "Page3.C6", "Page3.D6", "Page3.E6"], "Page3.NIE6"] },
    { label: "Urlop macierzyński albo urlop na warunkach urlopu macierzyńskiego", items: ["Page3.A6", "Page3.C6"] },
    { label: "Liczba ubezpieczonych – do 20 albo powyżej 20", items: ["Page4.TAK_PI", "Page4.NIE_PI"] },
    { label: "Praca w czasie urlopu rodzicielskiego (TAK / NIE)", items: ["Page4.TAK_7", "Page4.NIE_7"] },
  ],
  "Z-3a": [
    { label: "Pierwszy wniosek albo kontynuacja", items: ["Page1.pierwszywniosek", "Page1.wniosekkontynuacja"] },
    { label: "Ubezpieczenie chorobowe (TAK / NIE)", items: ["Page3.Informacje1A", "Page3.Informacje1B"] },
    { label: "Ubezpieczenie wypadkowe (TAK / NIE)", items: ["Page3.Informacje1C", "Page3.Informacje1D"] },
    { label: "Tytuł ubezpieczenia – zaznacz jeden", items: Array.from({ length: 11 }, (_, i) => `Page3.ZaznaczX${i + 1}`) },
    { label: "Tytuł ubezpieczenia ustał (TAK / NIE)", items: ["Page3.Informacje3TAK", "Page3.Informacje3NIE"] },
    { label: "Urlop bezpłatny / wychowawczy / areszt (TAK / NIE)", items: ["Page4.Informacje5TAK", "Page4.Informacje5NIE"] },
    { label: "Liczba ubezpieczonych – do 20 albo powyżej 20", items: ["Page4.PozostaleA", "Page4.PozostaleB"] },
  ],
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
    // tabela miesięczna (Z-3 / Z-3a): rozwijana do komórek druku
    if (f.name.startsWith("@table")) Object.assign(out, JSON.parse(String(v)));
    else out[f.name] = f.check ? Boolean(v) : f.max ? String(v).slice(0, f.max) : String(v);
  }
  return out;
}

const norm = (s?: string) => (s ?? "").toLocaleUpperCase("pl-PL").replace(/[\s.\-–,;:/]/g, "").replace(/^UL/, "");
/** Porównanie znormalizowane: wielkość liter, spacje, myślniki i kropki nie mają znaczenia. */
export const sameValue = (a: FieldValue | undefined, b: FieldValue | undefined) => {
  if (typeof a === "boolean" || typeof b === "boolean") return Boolean(a) === Boolean(b);
  return norm(a) === norm(b);
};
/** Porównanie wartości pola druku: lista rozwijana zapisuje pełną opcję („11 – dziecko własne…”), a aplikacja – jej kod („11”). */
export const sameFieldValue = (f: Pick<OfficialField, "select">, a: FieldValue | undefined, b: FieldValue | undefined) => {
  if (f.select && typeof a === "string" && typeof b === "string" && a && b) return optionCode(a) === optionCode(b);
  return sameValue(a, b);
};
const optionCode = (s: string) => norm(s.split(/\s[–-]\s|,/)[0]);
const blankValue = (v: FieldValue | undefined) => v === undefined || v === "" || v === false;
export { blankValue };

/** Skąd wziąć wartość pola – podpowiedź dla użytkownika przy brakach i różnicach. */
export function fieldSource(form: OfficialFormId, f: OfficialField): string {
  const payerForm = OFFICIAL_FORMS[form].filledBy === "płatnik";
  switch (f.read) {
    case "pesel": case "firstName": case "lastName":
      return "Dowód osobisty lub mObywatel (w aplikacji: Ustawienia → Twoje dane).";
    case "street": case "house": case "postal": case "city":
      return "Adres zamieszkania z mObywatela (Ustawienia → Twoje dane).";
    case "nip": case "regon": case "payerName":
      return "Dane płatnika składek: umowa, pasek wynagrodzenia albo PUE/eZUS → Dane o płatnikach; przy własnej firmie – CEIDG lub GUS (REGON).";
    case "bank":
      return "Numer rachunku z bankowości elektronicznej (26 cyfr). Bez rachunku ZUS wyśle przekaz pocztowy.";
    case "dueDate":
      return "Zaświadczenie lekarskie o przewidywanej dacie porodu (w aplikacji: Ciąża → termin porodu).";
    case "childPesel": case "childFirst": case "childLast": case "childBirth": case "childText": case "adoptionDate":
      return "Odpis aktu urodzenia albo mObywatel → dane dziecka (PESEL nadaje USC przy rejestracji urodzenia). W aplikacji: Ustawienia → Dziecko.";
    case "periodMat": case "periodPar": case "periodSup": case "periodPat": case "benefitMat": case "benefitPar": case "benefitSup": case "benefitPat": case "variant815":
      return "Plan urlopów z Kalkulatora (Kalkulator → Urlopy) – okresy muszą być zgodne z wnioskiem złożonym u pracodawcy.";
    case "sickPeriod":
      return "Zwolnienia lekarskie e-ZLA: PUE/eZUS → Zaświadczenia lekarskie.";
    case "insurancePeriod": case "insuranceFrom": case "insuranceEndDate": case "voluntaryYes": case "voluntaryNo": case "titleZlecenie": case "titleCode":
      return "PUE/eZUS → Dane o ubezpieczeniach (zgłoszenie ZUA) albo umowa z płatnikiem.";
    case "workTime":
      return "Umowa o pracę (wymiar etatu).";
    case "insuredUpTo20": case "insuredOver20":
      return "Kadry / księgowość płatnika: liczba osób zgłoszonych do ubezpieczenia chorobowego (stan na 30 listopada poprzedniego roku).";
    case "hospPeriod":
      return "Zaświadczenie szpitala o pobycie dziecka.";
    case "zaZyciem":
      return "Zaświadczenie lekarskie „Za życiem” (art. 4 ust. 3 ustawy o wspieraniu kobiet w ciąży i rodzin).";
  }
  if (/drugi rodzic|drugiego rodzica/i.test(f.section + f.label)) return "Dane drugiego rodzica (w aplikacji: Partner) i plan urlopów z Kalkulatora.";
  if (/telefon|e-mail/i.test(f.label)) return "Pole dobrowolne – Twój numer telefonu / e-mail (Ustawienia → Twoje dane).";
  if (/płatnik/i.test(f.section) || payerForm) return "Te informacje wpisuje płatnik składek (kadry, księgowość) – na podstawie dokumentacji pracowniczej.";
  return `Zgodnie z Twoją sytuacją – sekcja „${f.section}” druku ${OFFICIAL_FORMS[form].code}.`;
}

export const OFFICIAL_FOR_DOC: Record<string, OfficialFormId> = { ZAM: "ZAM", "ZAM-TATA": "ZAM", "ZAS-53": "ZAS-53", "Z-15": "Z-15", "Z-12": "Z-12", "NFZ-ZGLOSZENIE": "ZCNA", "Z-3": "Z-3", "Z-3a": "Z-3a", "ZUS-ZUA": "ZUA" };
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
export const OFFICIAL_TO_FORMCODE: Record<OfficialFormId, string> = { ZAM: "ZAM", "ZAS-53": "ZAS-53", "Z-15": "Z-15", "Z-12": "Z-12", ZCNA: "ZCNA", "Z-3": "Z-3", "Z-3a": "Z-3a", ZUA: "ZUA" };
/** Kod tytułu ubezpieczenia (ZUS ZUA, blok V) → tytuł w aplikacji. */
const TITLE_BY_ZUA_CODE: [RegExp, string][] = [[/^01/, "uop"], [/^04 11/, "zlecenie"], [/^05 70/, "jdg_preferencyjna"], [/^05 90/, "maly_zus_plus"], [/^05/, "jdg"], [/^04/, "zlecenie"]];

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
      case "adoptionDate": put("child.birthDate", fromDate8(s)); put("child.adoption", true); break;
      case "childText": {
        const kids = s.split(";").map((x) => x.trim()).filter(Boolean);
        put("child.birthDate", periodOf(s).from);
        put("child.firstName", kids[0]?.split(/[ ,]/)[0]);
        put("child.pesel", /PESEL\s*(\d{11})/i.exec(s)?.[1]);
        if (kids.length > 1) put("child.childrenCount", kids.length);
        break;
      }
      case "hospPeriod": { const p = periodOf(s); if (p.from && p.to) put("child.hospitalizationDays", Math.round((Date.parse(p.to) - Date.parse(p.from)) / 86_400_000) + 1); break; }
      case "signDate": put("signatureDate", fromDate8(s)); break;
      case "variant815": put("benefit.variant815", true); break;
      case "voluntaryYes": put("voluntarySickness", true); break;
      case "voluntaryNo": put("voluntarySickness", false); break;
      case "adoption": put("child.adoption", true); break;
      case "zaZyciem": put("child.zaZyciem", true); break;
      case "benefitMat": case "benefitPar": case "benefitSup": case "benefitPat":
        types.push({ benefitMat: "macierzyński", benefitPar: "rodzicielski", benefitSup: "uzupełniający", benefitPat: "ojcowski" }[f.read]);
        break;
      case "insurancePeriod": { const p = periodOf(s); put("insuranceStart", p.from); put("insuranceEnd", p.to); break; }
      case "insuranceFrom": put("insuranceStart", fromDate8(s)); break;
      case "insuranceEndDate": put("insuranceEnd", fromDate8(s)); break;
      case "workTime": put("workTimeFraction", parseEtat(s)); break;
      // druk podaje tylko „do 20” / „powyżej 20” – to wystarcza do ustalenia, kto wypłaca zasiłek (art. 61)
      case "insuredUpTo20": put("payer.insuredCount", 20); break;
      case "insuredOver20": put("payer.insuredCount", 21); break;
      case "titleZlecenie": put("title", "zlecenie"); break;
      case "titleCode": put("title", TITLE_BY_ZUA_CODE.find(([re]) => re.test(s))?.[1]); break;
      case "periodMat": case "periodPar": case "periodSup": case "periodPat": {
        const p = periodOf(s);
        types.push({ periodMat: "macierzyński", periodPar: "rodzicielski", periodSup: "uzupełniający", periodPat: "ojcowski" }[f.read]);
        if (!doc.benefit.from || (p.from && p.from < String(doc.benefit.from))) put("benefit.from", p.from);
        if (!doc.benefit.to || (p.to && p.to > String(doc.benefit.to))) put("benefit.to", p.to);
        break;
      }
      case "sickPeriod": {
        const leaves = s.split(";").map((x) => ({ p: periodOf(x), x })).filter(({ p }) => p.from && p.to).map(({ p, x }) => ({ series: /\b([A-Z]{2,3}\s?\d{6,9})\b/.exec(x)?.[1]?.replace(/\s/g, "") ?? null, from: p.from!, to: p.to!, codeB: /KOD B|\(B\)|CIĄŻ/i.test(x) }));
        if (leaves.length) { doc.sickLeaves = leaves; set.push("sickLeaves"); }
        break;
      }
      case "street": case "house": case "postal": case "city": addr.push(s); break;
    }
  }
  if (types.length) put("benefit.type", [...new Set(types)].join(" + "));
  if (form === "ZAS-53") put("benefit.type", "chorobowy");
  if (form === "Z-3") put("title", "uop");
  // tabela wynagrodzeń / przychodów z 12 miesięcy (Z-3: strona 4, Z-3a: strona 5)
  if (form === "Z-3" || form === "Z-3a") {
    const months = readIncomeTable(form, values);
    if (months.length) { doc.incomeMonths = months; set.push("incomeMonths"); }
  }
  if (form === "ZAM") {
    // „Za życiem” to pole wyboru przy danych urodzonego / przyjętego dziecka – gdy te dane wpisano, brak zaznaczenia oznacza „nie”
    if (doc.child.zaZyciem == null && (!blankValue(values["Page3.Tekst1"]) || !blankValue(values["Page3.Tekst13B"]))) doc.child.zaZyciem = false;
    // oświadczenie o 81,5% składa matka razem z wnioskiem za urlop macierzyński – brak zaznaczenia = wariant standardowy (100% / 70%)
    if (doc.benefit.variant815 == null && (values["Page2.macierzynskiego"] === true || values["Page2.nawarunkach"] === true)) doc.benefit.variant815 = false;
  }
  if (form === "ZAM" && (values["Page2.ZaznaczX1b"] === true || values["Page2.ZaznaczX1c"] === true)) put("child.adoption", true);
  if (addr.length) put("insured.address", addr.join(" "));
  return set;
}

const sfx = (i: number) => (i ? `[${i}]` : "");
const amount = (v: FieldValue | undefined) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const intOf = (v: FieldValue | undefined) => (typeof v === "string" && /^\d{1,2}$/.test(v.trim()) ? Number(v) : null);
/** Odczyt tabeli miesięcznej z Z-3 / Z-3a → incomeMonths (kwota brutto, dni przepracowane / obowiązujące). */
function readIncomeTable(form: "Z-3" | "Z-3a", v: Record<string, FieldValue>): { month: string; gross: number; workedDays: number | null; requiredDays: number | null }[] {
  const out: { month: string; gross: number; workedDays: number | null; requiredDays: number | null }[] = [];
  for (let i = 0; i < 12; i++) {
    if (form === "Z-3") {
      const year = String(v[`Page4.ROK${sfx(i)}`] ?? "").trim();
      const month = String(v[`Page4.Miesiac${sfx(i * 5)}`] ?? "").trim().padStart(2, "0");
      // kolumny: stałe składniki w pełnej wysokości | zmienne pomniejszane proporcjonalnie | premie w kwocie faktycznej
      const fixed = amount(v[`Page4.Podstawawymiaru${sfx(i)}`]);
      const variable = amount(v[`Page4.Miesiac[${i * 5 + 2}]`]);
      const bonus = amount(v[`Page4.Miesiac[${i * 5 + 3}]`]) ?? 0;
      const gross = (variable ?? fixed ?? 0) + bonus;
      if (!/^\d{4}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month) || !gross) continue;
      out.push({ month: `${year}-${month}`, gross, workedDays: intOf(v[`Page4.Miesiac[${i * 5 + 1}]`]), requiredDays: intOf(v[`Page4.Przepracowal${sfx(i)}`]) });
    } else {
      const year = String(v[`Page5.ROK${sfx(i)}`] ?? "").trim();
      const month = String(v[`Page5.Miesiac${sfx(i)}`] ?? "").trim().padStart(2, "0");
      const gross = amount(v[`Page5.Podstawawymiaru${sfx(i)}`]);
      if (!/^\d{4}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month) || !gross) continue;
      out.push({ month: `${year}-${month}`, gross, workedDays: intOf(v[`Page5.Przepracowal${sfx(i)}`]), requiredDays: intOf(v[`Page5.Liczbadni${sfx(i)}`]) });
    }
  }
  return out.sort((a, b) => a.month.localeCompare(b.month));
}
/** Komórki tabeli miesięcznej: widoczna kolumna kwoty z etykietą „MM/RRRR”, pozostałe (rok, miesiąc, dni, % składki) ukryte. */
export function tableCells(vals: Record<string, FieldValue>, known: Set<string>): { key: string; label: string; hidden: boolean }[] {
  return Object.keys(vals)
    .filter((k) => !known.has(k) && /^Page[45]\.(ROK|Miesiac|Przepracowal|Liczbadni|Podstawawymiaru)/.test(k))
    .map((k) => {
      const m = /^(Page[45])\.Podstawawymiaru(?:\[(\d+)\])?$/.exec(k);
      if (!m) return { key: k, label: k, hidden: true };
      const i = Number(m[2] ?? 0);
      const month = vals[`${m[1]}.Miesiac${sfx(m[1] === "Page4" ? i * 5 : i)}`];
      return { key: k, label: `Wynagrodzenie / przychód – ${month}/${vals[`${m[1]}.ROK${sfx(i)}`]}`, hidden: false };
    });
}
