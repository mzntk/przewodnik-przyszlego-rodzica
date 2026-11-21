/**
 * Katalog wniosków: (a) urlopowe do pracodawcy – zaprojektowane wg rozporządzenia MRPiPS z 11.03.2025 (Dz.U. poz. 322),
 * (b) druki ZUS (stan po 24.10.2026: ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15A, Z-15B, Z-12), (c) USC.
 * Pola są autouzupełniane z profilu i wyniku deterministycznego silnika.
 */
import type { CalculationResult } from "@/models/types";
import type { CaseData } from "@/store/app";
import { dPL } from "@/lib/utils";

export interface FormDef {
  id: string;
  code: string;
  title: string;
  target: "pracodawca" | "ZUS" | "USC";
  legal: string;
  when: string;
  forEmployeeOnly?: boolean;
  fields: { key: string; label: string; value: string; type?: "text" | "date" | "textarea" }[];
  attachments: string[];
  statements?: string[];
  relevant: boolean;
}

export function buildForms(d: CaseData, r: CalculationResult): FormDef[] {
  const m = d.mother;
  const f = d.father;
  const name = `${m.firstName} ${m.lastName}`.trim();
  const fname = f ? `${f.firstName} ${f.lastName}`.trim() : "";
  const event = d.child.birthDate ?? d.child.dueDate;
  const seg = (k: string, who: "matka" | "ojciec" = "matka") => r.segments.find((s) => s.kind === k && s.who === who);
  const segs = (pred: (k: string) => boolean, who: "matka" | "ojciec") => r.segments.filter((s) => s.who === who && pred(s.kind));
  const mat = seg("macierzynski");
  const sup = seg("uzupelniajacy");
  const parM = segs((k) => k.startsWith("rodzicielski"), "matka");
  const parF = segs((k) => k.startsWith("rodzicielski"), "ojciec");
  const work = r.segments.find((s) => s.kind === "rodzicielski_praca");
  const pat = segs((k) => k === "ojcowski", "ojciec");
  const employee = m.title === "uop";
  const payerZus = r.mother.eligibility.payer.payer === "zus";
  const birthDoc = payerZus ? [] : ["Odpis skrócony aktu urodzenia dziecka (lub jego kopia)"];
  const bio = d.child.path === "biologiczny";

  return [
    {
      id: "mat-przed",
      code: "WNIOSEK",
      title: "Wniosek o udzielenie części urlopu macierzyńskiego przed przewidywaną datą porodu",
      target: "pracodawca",
      legal: "art. 180 § 2 KP; § 2 rozporządzenia MRPiPS z 11.03.2025",
      when: "Najwcześniej 6 tyg. przed terminem porodu; złóż ok. 14 dni przed startem",
      forEmployeeOnly: true,
      fields: [
        { key: "name", label: "Imię i nazwisko pracownicy", value: name },
        { key: "from", label: "Data, od której ma być udzielona część urlopu macierzyńskiego", value: dPL(mat?.from ?? event), type: "date" },
        { key: "due", label: "Przewidywana data porodu", value: dPL(d.child.dueDate), type: "date" },
      ],
      attachments: ["Kopia zaświadczenia lekarskiego (zwykły druk) określającego przewidywaną datę porodu"],
      relevant: employee && bio && !d.child.birthDate,
    },
    {
      id: "rodzicielski",
      code: "WNIOSEK",
      title: "Wniosek o udzielenie urlopu rodzicielskiego (części)",
      target: "pracodawca",
      legal: "art. 182¹d § 1 KP; § 15 rozporządzenia MRPiPS z 11.03.2025",
      when: "Min. 21 dni przed rozpoczęciem urlopu",
      forEmployeeOnly: true,
      fields: [
        { key: "name", label: "Imię i nazwisko pracownika", value: name },
        { key: "used", label: "Dotychczas wykorzystany urlop rodzicielski / zasiłek za ten okres i liczba części", value: "0 tygodni, 0 części" },
        { key: "period", label: "Okres, na który ma być udzielony urlop rodzicielski", value: parM.length ? `od ${dPL(parM[0].from)} do ${dPL(parM.at(-1)!.to)}` : "" },
        { key: "child", label: "Imię i nazwisko oraz data urodzenia dziecka", value: `${m.lastName ? `dziecko ${m.lastName}` : ""}, ${dPL(event)}` },
      ],
      attachments: [...birthDoc, "Oświadczenie o braku zamiaru korzystania z urlopu rodzicielskiego przez drugiego rodzica w tym samym okresie (lub o łącznym wymiarze)"],
      relevant: employee && parM.length > 0,
    },
    {
      id: "laczenie",
      code: "WNIOSEK",
      title: "Wniosek o łączenie urlopu rodzicielskiego z pracą u pracodawcy",
      target: "pracodawca",
      legal: "art. 182¹e § 2 i art. 182¹f § 6 KP",
      when: "Min. 21 dni przed podjęciem pracy",
      forEmployeeOnly: true,
      fields: [
        { key: "name", label: "Imię i nazwisko pracownika", value: d.plan.combineWithWork.who === "ojciec" ? fname : name },
        { key: "fraction", label: "Wymiar czasu pracy w trakcie urlopu", value: `${Math.round(d.plan.combineWithWork.fraction * 100)}% etatu (nie więcej niż 1/2)` },
        { key: "period", label: "Okres łączenia urlopu z pracą", value: work ? `od ${dPL(work.from)} do ${dPL(work.to)}` : "" },
        { key: "ext", label: "Sposób wykorzystania części urlopu, o którą urlop zostanie wydłużony", value: `wydłużenie o ${r.leave.parentalExtensionDays} dni – bezpośrednio w ramach okresu łączenia (art. 182¹f § 5)`, type: "textarea" },
      ],
      attachments: [],
      relevant: employee && d.plan.combineWithWork.enabled,
    },
    {
      id: "uzupelniajacy",
      code: "WNIOSEK",
      title: "Wniosek o udzielenie uzupełniającego urlopu macierzyńskiego",
      target: "pracodawca",
      legal: "art. 180² § 4 KP; § 14 rozporządzenia MRPiPS z 11.03.2025",
      when: "Min. 21 dni przed końcem urlopu macierzyńskiego",
      forEmployeeOnly: true,
      fields: [
        { key: "name", label: "Imię i nazwisko pracownicy", value: name },
        { key: "matEnd", label: "Termin zakończenia urlopu macierzyńskiego", value: dPL(mat?.to) },
        { key: "period", label: "Okres uzupełniającego urlopu macierzyńskiego", value: sup ? `od ${dPL(sup.from)} do ${dPL(sup.to)} (${r.leave.supplementaryWeeks} tyg.)` : "" },
      ],
      attachments: ["Zaświadczenie szpitala o urodzeniu (tydzień ciąży, masa) i okresie pobytu dziecka w szpitalu (art. 180² § 5 KP)", "Oświadczenie o braku zamiaru korzystania z uzupełniającego urlopu przez drugiego rodzica"],
      relevant: employee && r.leave.supplementaryWeeks > 0,
    },
    {
      id: "ojcowski",
      code: "WNIOSEK",
      title: "Wniosek o udzielenie urlopu ojcowskiego",
      target: "pracodawca",
      legal: "art. 182³ KP",
      when: "Min. 7 dni przed rozpoczęciem; do ukończenia przez dziecko 12 miesięcy",
      fields: [
        { key: "name", label: "Imię i nazwisko pracownika – ojca wychowującego dziecko", value: fname },
        { key: "child", label: "Data urodzenia dziecka", value: dPL(event) },
        { key: "period", label: "Okres urlopu ojcowskiego", value: pat.map((p) => `${dPL(p.from)}–${dPL(p.to)}`).join(", ") },
      ],
      attachments: [...(f?.payer && f.payer.insuredCount > 20 ? ["Odpis skrócony aktu urodzenia dziecka"] : [])],
      relevant: !!f && pat.length > 0,
    },
    {
      id: "rodzicielski-tata",
      code: "WNIOSEK",
      title: "Wniosek o udzielenie urlopu rodzicielskiego – tata (9 tyg. niezbywalne)",
      target: "pracodawca",
      legal: "art. 182¹a § 4 i art. 182¹d KP; § 15 rozporządzenia",
      when: "Min. 21 dni przed rozpoczęciem",
      fields: [
        { key: "name", label: "Imię i nazwisko pracownika", value: fname },
        { key: "used", label: "Dotychczas wykorzystany urlop rodzicielski (oboje rodzice) i liczba części", value: `${d.plan.motherParentalWeeks} tyg. (matka), części: 1` },
        { key: "period", label: "Okres urlopu rodzicielskiego", value: parF.length ? `od ${dPL(parF[0].from)} do ${dPL(parF.at(-1)!.to)}` : "" },
      ],
      attachments: ["Odpis skrócony aktu urodzenia dziecka (lub kopia)", "Oświadczenie matki o okresie wykorzystanego urlopu rodzicielskiego"],
      relevant: !!f && parF.length > 0,
    },
    {
      id: "zam",
      code: "ZAM",
      title: "Wniosek o zasiłek macierzyński (połączony z dawnymi ZUR i ZAO)",
      target: "ZUS",
      legal: "art. 29–31 ustawy zasiłkowej; Załącznik 6 rozporządzenia z 27.09.2026",
      when: employee ? "Pracownik nie składa ZAM – wystarczy wniosek urlopowy do pracodawcy" : "Po porodzie (lub do 6 tyg. przed – z zaświadczeniem lekarskim)",
      fields: [
        { key: "name", label: "Imię i nazwisko ubezpieczonej", value: name },
        { key: "pesel", label: "PESEL", value: m.pesel },
        { key: "payer", label: "Płatnik składek (NIP, nazwa)", value: m.payer?.name ? `${m.payer.name}, NIP ${m.payer.nip}` : "osoba prowadząca działalność – płatnik za siebie" },
        { key: "type", label: "Rodzaj świadczenia i okres", value: `macierzyński ${dPL(mat?.from)}–${dPL(mat?.to)}${parM.length ? `; rodzicielski ${dPL(parM[0].from)}–${dPL(parM.at(-1)!.to)}` : ""}` },
        { key: "event", label: bio ? "Data porodu / przewidywana data porodu" : "Data przyjęcia dziecka", value: dPL(event) },
        { key: "variant", label: "Wniosek o 81,5% za cały okres (art. 30a)", value: d.plan.variant === "combined" ? "TAK" : "NIE" },
        { key: "zz", label: "Zaświadczenie „Za życiem”", value: d.child.zaZyciem ? "TAK" : "NIE" },
        { key: "bank", label: "Numer rachunku bankowego", value: "" },
      ],
      statements: ["Zamierzam korzystać z pełnego wymiaru urlopu i co najmniej jeden dzień rodzicielskiego przypadnie w 1. roku życia dziecka (Zał. 6 pkt 15)"],
      attachments: [...(payerZus ? [] : ["Odpis skrócony aktu urodzenia dziecka"]), ...(d.child.zaZyciem ? ["Zaświadczenie „Za życiem”"] : []), ...(r.leave.supplementaryWeeks ? ["Zaświadczenie szpitala o pobycie dziecka"] : [])],
      relevant: !employee,
    },
    {
      id: "zas53",
      code: "ZAS-53",
      title: "Wniosek o zasiłek chorobowy (przedsiębiorca)",
      target: "ZUS",
      legal: "Załącznik 1 rozporządzenia z 27.09.2026",
      when: "Po otrzymaniu e-ZLA",
      fields: [
        { key: "name", label: "Imię i nazwisko", value: name },
        { key: "pesel", label: "PESEL", value: m.pesel },
        { key: "period", label: "Okres niezdolności i seria/nr e-ZLA", value: m.sickLeaves.map((l) => `${dPL(l.from)}–${dPL(l.to)}${l.codeB ? " (B)" : ""}`).join("; ") },
        { key: "bank", label: "Numer rachunku bankowego", value: "" },
      ],
      attachments: [],
      relevant: ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(m.title) && m.sickLeaves.length > 0,
    },
    {
      id: "z15a",
      code: "Z-15A",
      title: "Wniosek o zasiłek opiekuńczy – opieka nad dzieckiem",
      target: "ZUS",
      legal: "art. 32–35 ustawy zasiłkowej; Załącznik 7 rozporządzenia z 27.09.2026",
      when: "Po okresie opieki",
      fields: [
        { key: "name", label: "Imię i nazwisko", value: name },
        { key: "pesel", label: "PESEL", value: m.pesel },
        { key: "child", label: "Dane dziecka (imię, nazwisko, PESEL, data urodzenia)", value: "" },
        { key: "period", label: "Okres opieki i seria/nr zaświadczenia lekarskiego", value: "" },
      ],
      statements: ["Nie ma innego domownika mogącego zapewnić opiekę w tym okresie", "W tym roku drugi rodzic pobrał zasiłek opiekuńczy za ___ dni"],
      attachments: [],
      relevant: true,
    },
    {
      id: "z12",
      code: "Z-12",
      title: "Wniosek o zasiłek pogrzebowy",
      target: "ZUS",
      legal: "art. 77–80 ustawy o emeryturach i rentach z FUS",
      when: "Do 12 miesięcy od dnia śmierci (także przy martwym urodzeniu)",
      fields: [
        { key: "name", label: "Imię i nazwisko wnioskodawcy", value: name },
        { key: "pesel", label: "PESEL", value: m.pesel },
        { key: "death", label: "Data zgonu / martwego urodzenia", value: dPL(d.child.childDeathDate ?? (d.child.stillbirth ? event : "")) },
        { key: "bank", label: "Numer rachunku bankowego", value: "" },
      ],
      attachments: ["Skrócony odpis aktu zgonu (karta martwego urodzenia)", "Rachunki potwierdzające koszty pogrzebu"],
      relevant: !!(d.child.stillbirth || d.child.childDeathDate),
    },
    {
      id: "usc",
      code: "USC",
      title: "Wniosek o wydanie odpisu aktu urodzenia",
      target: "USC",
      legal: "art. 44–45 ustawy – Prawo o aktach stanu cywilnego",
      when: "Po rejestracji urodzenia (do 21 dni od wystawienia karty urodzenia)",
      fields: [
        { key: "name", label: "Wnioskodawca", value: name },
        { key: "kind", label: "Rodzaj odpisu", value: "skrócony (do pracodawcy) / zupełny" },
        { key: "child", label: "Dane dziecka i data urodzenia", value: dPL(event) },
        { key: "purpose", label: "Cel", value: payerZus ? "do celów prywatnych (ZUS nie wymaga – § 13 ust. 2)" : "do zakładu pracy – zasiłek macierzyński" },
      ],
      attachments: ["Pierwszy odpis skrócony po rejestracji urodzenia USC wydaje z urzędu; kolejne odpisy – opłata skarbowa wg ustawy o opłacie skarbowej"],
      relevant: bio,
    },
  ];
}
