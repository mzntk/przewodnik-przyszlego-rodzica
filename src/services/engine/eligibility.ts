/**
 * Silnik uprawnień: podleganie ubezpieczeniu chorobowemu, okres wyczekiwania (art. 4),
 * blokada zadłużenia JDG (art. 2a) i routing płatnika (art. 61).
 */
import type { LegalConfig } from "@/models/legal-config";
import type { DocumentRequirement, EligibilityResult, ParentProfile, PayerRouting, LegalRef } from "@/models/types";
import { addDays, addMonths, diffDays, round2 } from "./dates";

const MANDATORY: ParentProfile["title"][] = ["uop"];

export function sicknessInsuranceStatus(p: ParentProfile): { insured: boolean; label: string; reason: string; legal: LegalRef[] } {
  switch (p.title) {
    case "uop":
      return {
        insured: true,
        label: "TAK – obowiązkowe ubezpieczenie chorobowe",
        reason: "Pracownik podlega obowiązkowo ubezpieczeniu chorobowemu.",
        legal: [{ act: "u.s.u.s.", article: "art. 11 ust. 1" }],
      };
    case "zlecenie":
    case "jdg":
    case "jdg_preferencyjna":
    case "maly_zus_plus":
      return p.voluntarySickness
        ? {
            insured: true,
            label: "TAK – dobrowolne ubezpieczenie chorobowe",
            reason: "Osoba zgłoszona do dobrowolnego ubezpieczenia chorobowego (ZUS ZUA z kodem chorobowym).",
            legal: [{ act: "u.s.u.s.", article: "art. 11 ust. 2" }],
          }
        : {
            insured: false,
            label: "NIE – brak dobrowolnego ubezpieczenia chorobowego",
            reason: "Ubezpieczenie chorobowe z tego tytułu jest dobrowolne i nie zostało zgłoszone. Brak prawa do zasiłku chorobowego i macierzyńskiego.",
            legal: [{ act: "u.s.u.s.", article: "art. 11 ust. 2" }],
          };
    case "ulga_na_start":
      return {
        insured: false,
        label: "NIE – ulga na start",
        reason: "W okresie ulgi na start przedsiębiorca nie podlega ubezpieczeniom społecznym, także chorobowemu (podlega tylko zdrowotnemu).",
        legal: [{ act: "u.s.u.s.", article: "art. 18 Prawa przedsiębiorców" }],
      };
    case "nierejestrowa":
      return {
        insured: false,
        label: "NIE – działalność nierejestrowa",
        reason: "Działalność nierejestrowa nie stanowi tytułu do ubezpieczeń społecznych.",
        legal: [{ act: "u.s.u.s.", article: "art. 5 Prawa przedsiębiorców" }],
      };
    case "student_zlecenie":
      return {
        insured: false,
        label: "NIE – student/uczeń do 26 lat na zleceniu",
        reason: "Zleceniobiorca będący studentem lub uczniem do ukończenia 26 lat nie podlega ubezpieczeniom społecznym.",
        legal: [{ act: "u.s.u.s.", article: "art. 6 ust. 4" }],
      };
    default:
      return {
        insured: false,
        label: "NIE – brak tytułu ubezpieczenia",
        reason: "Brak tytułu do ubezpieczenia chorobowego na dzień zdarzenia.",
        legal: [{ act: "ustawa zasiłkowa", article: "art. 29 ust. 1" }],
      };
  }
}

export function waitingPeriod(p: ParentProfile, eventIso: string, cfg: LegalConfig): EligibilityResult["waitingPeriod"] {
  const mandatory = MANDATORY.includes(p.title);
  const required = mandatory ? cfg.waiting.mandatoryDays : cfg.waiting.voluntaryDays;
  const start = p.insuranceStart;
  let carried = 0;
  if (p.previousInsuranceEnd && p.previousInsuranceMonths) {
    const gap = diffDays(p.previousInsuranceEnd, p.insuranceStart) - 1;
    if (gap <= cfg.waiting.breakToleranceDays) carried = Math.round(p.previousInsuranceMonths * 30);
  }
  const served = Math.max(0, diffDays(start, eventIso)) + carried;
  const ex = p.waitingExceptions ?? {};
  let exception: string | undefined;
  if (ex.graduate) exception = "Absolwent zgłoszony w ciągu 90 dni od ukończenia szkoły/uczelni (art. 4 ust. 3 pkt 1)";
  else if (ex.commutingAccident) exception = "Wypadek w drodze do/z pracy (art. 4 ust. 3 pkt 2)";
  else if (ex.tenYearsMandatory && mandatory) exception = "Co najmniej 10 lat wcześniejszego obowiązkowego ubezpieczenia (art. 4 ust. 3 pkt 3)";
  const satisfied = Boolean(exception) || served >= required;
  const eligibleFrom = exception ? p.insuranceStart : addDays(start, Math.max(0, required - carried));
  return { required, served, satisfied, exception, eligibleFrom };
}

export function debtCheck(p: ParentProfile, eventIso: string, cfg: LegalConfig): EligibilityResult["debtBlock"] {
  const applies = ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(p.title);
  const threshold = round2(cfg.minWage * cfg.debtThresholdRate);
  const debt = p.contributionDebt ?? 0;
  const blocked = applies && debt > threshold;
  return {
    applies,
    blocked,
    debt,
    threshold,
    expiresOn: blocked ? addMonths(eventIso, cfg.debtPrescriptionMonths) : undefined,
  };
}

export function routePayer(p: ParentProfile, cfg: LegalConfig, ctx: { benefit: "chorobowy" | "macierzynski" | "opiekunczy" }): PayerRouting {
  const isEmployee = p.title === "uop";
  const isZlecenie = p.title === "zlecenie";
  const isJdg = ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(p.title);
  const count = p.payer?.insuredCount ?? 0;
  const large = !isJdg && count > cfg.largePayerThreshold;
  const legal: LegalRef[] = [{ act: "ustawa zasiłkowa", article: large ? "art. 61 ust. 1 pkt 1" : "art. 61 ust. 1 pkt 2" }];

  const docs: DocumentRequirement[] = [];
  if (ctx.benefit === "chorobowy") {
    docs.push({ code: "e-ZLA", name: "Elektroniczne zaświadczenie lekarskie (kod „B”)", who: "lekarz", to: "ZUS", when: "Wystawia lekarz – trafia automatycznie do ZUS i na PUE/eZUS płatnika" });
    if (isEmployee && !large) docs.push({ code: "Z-3", name: "Zaświadczenie płatnika składek (pracownik)", who: "płatnik", to: "ZUS", when: "Pracodawca przekazuje do ZUS po okresie wynagrodzenia chorobowego" });
    if (isEmployee && !large) docs.push({ code: "ZAS-12", name: "Zaświadczenie płatnika składek – na dalszy okres", who: "płatnik", to: "ZUS", when: "Przy kolejnych zwolnieniach bez zmiany podstawy" });
    if (isZlecenie && !large) docs.push({ code: "Z-3a", name: "Zaświadczenie płatnika składek (niepracownik)", who: "płatnik", to: "ZUS", when: "Zleceniodawca przekazuje do ZUS" });
    if (isJdg) docs.push({ code: "ZAS-53", name: "Wniosek o zasiłek chorobowy (przedsiębiorca)", who: "ubezpieczony", to: "ZUS", when: "Składasz sam(a) przez PUE/eZUS po otrzymaniu e-ZLA" });
  }
  if (ctx.benefit === "macierzynski") {
    if (isEmployee) {
      docs.push({ code: "WNIOSEK-URLOP", name: "Wniosek o urlop macierzyński / rodzicielski (do pracodawcy)", who: "ubezpieczony", to: "pracodawca", when: "Przed porodem: min. 14 dni przed startem; rodzicielski: min. 21 dni przed", note: "Wzór wg rozporządzenia z 11.03.2025 (§ 2–20)" });
      if (!large) docs.push({ code: "Z-3", name: "Zaświadczenie płatnika składek", who: "płatnik", to: "ZUS", when: "Pracodawca przesyła do ZUS razem z wnioskiem" });
    } else {
      docs.push({ code: "ZAM", name: "Wniosek o zasiłek macierzyński (połączony z dawnymi ZUR i ZAO)", who: "ubezpieczony", to: large ? "pracodawca" : "ZUS", when: "Po porodzie (lub do 6 tyg. przed – z zaświadczeniem o terminie porodu)" });
      if (isZlecenie && !large) docs.push({ code: "Z-3a", name: "Zaświadczenie płatnika składek (niepracownik)", who: "płatnik", to: "ZUS", when: "Zleceniodawca przesyła do ZUS" });
    }
    if (large) docs.push({ code: "ODPIS-AKTU", name: "Odpis skrócony aktu urodzenia dziecka", who: "USC", to: "pracodawca", when: "Po rejestracji urodzenia w USC" });
  }
  if (ctx.benefit === "opiekunczy") {
    docs.push({ code: "Z-15A", name: "Wniosek o zasiłek opiekuńczy – opieka nad dzieckiem", who: "ubezpieczony", to: large ? "pracodawca" : "ZUS", when: "Po okresie opieki, z e-ZLA lub oświadczeniem o zamknięciu placówki" });
  }

  return {
    payer: large ? "pracodawca" : "zus",
    payerLabel: large ? `Płatnik składek – ${p.payer?.name ?? "pracodawca"}` : "Zakład Ubezpieczeń Społecznych",
    reason: isJdg
      ? "Osoba prowadząca działalność jest płatnikiem składek za siebie – zasiłki wypłaca ZUS."
      : large
        ? `Płatnik zgłaszał ${count} osób do ubezpieczenia chorobowego (> ${cfg.largePayerThreshold}) na 30 listopada poprzedniego roku – sam ustala prawo i wypłaca zasiłek.`
        : `Płatnik zgłaszał ${count} osób (≤ ${cfg.largePayerThreshold}) – zasiłek ustala i wypłaca ZUS; płatnik przekazuje dokumenty do ZUS.`,
    legal,
    submitTo: large ? "Dokumenty składasz u pracodawcy (dział kadr)." : isEmployee ? "Dokumenty składasz u pracodawcy – on przekazuje je do ZUS (PUE/eZUS)." : "Dokumenty składasz bezpośrednio w ZUS (PUE/eZUS lub placówka).",
    documents: docs,
    birthCertificateRequired: large,
  };
}

export function evaluateEligibility(p: ParentProfile, eventIso: string, cfg: LegalConfig, benefit: "chorobowy" | "macierzynski" = "macierzynski"): EligibilityResult {
  const status = sicknessInsuranceStatus(p);
  const wp = waitingPeriod(p, eventIso, cfg);
  const debt = debtCheck(p, eventIso, cfg);
  return {
    insured: status.insured,
    insuredLabel: status.label,
    reason: status.reason,
    legal: status.legal,
    waitingPeriod: status.insured ? wp : { ...wp, satisfied: false, eligibleFrom: null },
    debtBlock: debt,
    payer: routePayer(p, cfg, { benefit }),
  };
}
