/**
 * Oś czasu i terminy graniczne (hard deadlines) liczone od daty porodu / przyjęcia dziecka.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { CaseInput, Deadline } from "@/models/types";
import { addDays, addMonths, diffDays } from "./dates";

interface Ctx {
  maternityEnd: string;
  motherParentalStart: string;
  motherInsured: boolean;
  fatherInsured: boolean;
  combineWorkStart?: string;
  payerIsZus: boolean;
  isJdg: boolean;
}

export function buildDeadlines(input: CaseInput, cfg: LegalConfig, ctx: Ctx): Deadline[] {
  const { child } = input;
  const event = child.birthDate ?? child.dueDate;
  const d = cfg.deadlines;
  const list: Omit<Deadline, "daysLeft">[] = [];
  const bio = child.path === "biologiczny";

  if (bio && !child.birthDate && ctx.motherInsured) {
    const earliest = addDays(child.dueDate, -cfg.leave.maternityMaxBeforeBirthWeeks * 7);
    list.push({
      id: "mat-before",
      date: addDays(earliest, -d.maternityBeforeBirthApplicationDays),
      windowStart: earliest,
      title: "Wniosek o macierzyński przed porodem",
      description: `Jeśli chcesz zacząć urlop przed porodem: najwcześniej ${cfg.leave.maternityMaxBeforeBirthWeeks} tyg. przed terminem, wniosek min. ${d.maternityBeforeBirthApplicationDays} dni przed startem (z zaświadczeniem lekarskim o przewidywanej dacie porodu).`,
      who: "matka",
      severity: "info",
      kind: "przed_porodem",
      legal: [{ act: "Kodeks pracy", article: "art. 180 § 2" }, { act: "rozporządzenie 27.09.2026", article: "§ 13 ust. 1 pkt 1" }],
    });
  }

  if (bio && !child.stillbirth) {
    list.push({
      id: "usc",
      date: addDays(event, d.usCRegistrationDays),
      title: "Rejestracja urodzenia w USC",
      description: "Akt urodzenia, nadanie PESEL i zameldowanie dziecka. Bez ślubu – uznanie ojcostwa (najlepiej jeszcze w ciąży). Ojciec może to załatwić sam.",
      who: "ojciec",
      severity: "warning",
      kind: "po_porodzie",
      legal: [{ act: "ustawa o rejestracji stanu cywilnego", article: "art. 54" }],
    });
    list.push({
      id: "zcna",
      date: addDays(event, d.usCRegistrationDays + d.healthInsuranceDays),
      title: ctx.isJdg ? "Zgłoszenie dziecka do ubezpieczenia zdrowotnego (ZUS ZCNA)" : "Zgłoszenie dziecka do NFZ u pracodawcy",
      description: `${d.healthInsuranceDays} dni od nadania PESEL (data szacunkowa – liczona od najpóźniejszej rejestracji w USC). ${ctx.isJdg ? "Przedsiębiorca składa ZUS ZCNA sam w PUE/eZUS." : "Wystarczy oświadczenie w kadrach."}`,
      who: "oboje",
      severity: "warning",
      kind: "po_porodzie",
    });
  }

  if (ctx.motherInsured && !child.stillbirth) {
    list.push({
      id: "combined",
      date: addDays(event, d.combinedApplicationDays),
      title: "Wniosek o 81,5% za cały okres (opcjonalnie)",
      description: `Tylko do ${d.combinedApplicationDays} dni po ${bio ? "porodzie" : "przyjęciu dziecka"}. Po terminie zostaje wariant 100% + 70%.`,
      who: "matka",
      severity: "gold",
      kind: "swiadczenia",
      legal: [{ act: "ustawa zasiłkowa", article: "art. 30a" }],
    });
    list.push({
      id: "parental-app",
      date: addDays(ctx.motherParentalStart, -d.leaveApplicationDaysBefore),
      title: "Wniosek o urlop rodzicielski / uzupełniający",
      description: `Najpóźniej ${d.leaveApplicationDaysBefore} dni przed końcem macierzyńskiego (start rodzicielskiego). Gwarantuje ciągłość zasiłku.`,
      who: "matka",
      severity: "warning",
      kind: "urlop",
      legal: [{ act: "Kodeks pracy", article: "art. 182¹d § 1" }],
    });
  }

  if (ctx.combineWorkStart) {
    list.push({
      id: "combine-work",
      date: addDays(ctx.combineWorkStart, -d.leaveApplicationDaysBefore),
      title: "Wniosek o łączenie rodzicielskiego z pracą",
      description: `Min. ${d.leaveApplicationDaysBefore} dni przed podjęciem pracy w niepełnym wymiarze. Pracodawca może odmówić tylko z powodu organizacji pracy (informuje w ciągu 7 dni).`,
      who: input.plan.combineWithWork.who,
      severity: "info",
      kind: "urlop",
      legal: [{ act: "Kodeks pracy", article: "art. 182¹e § 2" }],
    });
  }

  if (!child.stillbirth) {
    list.push({
      id: "800plus",
      date: addMonths(event, d.family800RetroMonths),
      title: "Wniosek o 800+ (z wyrównaniem od urodzenia)",
      description: `Złożenie do ${d.family800RetroMonths} miesięcy od ${bio ? "urodzenia" : "przyjęcia"} gwarantuje wypłatę od pierwszego dnia. Wniosek przez PUE/eZUS, bankowość lub mObywatel.`,
      who: "oboje",
      severity: "warning",
      kind: "swiadczenia",
      legal: [{ act: "ustawa 800+", article: "art. 26 ust. 2" }],
    });
  }

  if (ctx.fatherInsured && !child.stillbirth) {
    list.push({
      id: "paternity",
      date: addMonths(event, cfg.leave.paternityMaxChildAgeMonths),
      title: "Urlop ojcowski – wygasa",
      description: `${cfg.leave.paternityWeeks} tygodnie (jednorazowo lub 2 × 7 dni) do ukończenia przez dziecko ${cfg.leave.paternityMaxChildAgeMonths} miesięcy. Wniosek min. 7 dni przed startem.`,
      who: "ojciec",
      severity: "warning",
      kind: "urlop",
      legal: [{ act: "Kodeks pracy", article: "art. 182³ § 1" }],
    });
  }

  if (bio && !child.stillbirth) {
    list.push({
      id: "becikowe",
      date: addMonths(event, d.becikoweMonths),
      title: "Becikowe – termin wniosku",
      description: `Jednorazowa zapomoga ${cfg.amounts.becikowe} zł przy dochodzie ≤ ${cfg.amounts.becikoweIncomeLimit} zł netto na osobę; wymaga opieki medycznej od 10. tyg. ciąży.`,
      who: "oboje",
      severity: "info",
      kind: "swiadczenia",
      legal: [{ act: "u.ś.r.", article: "art. 15b" }],
    });
  }

  if (child.stillbirth || child.childDeathDate) {
    const death = child.childDeathDate ?? event;
    list.push({
      id: "z12",
      date: addMonths(death, d.funeralMonths),
      title: "Zasiłek pogrzebowy (Z-12)",
      description: `${cfg.amounts.funeralGrant.toLocaleString("pl-PL")} zł – wniosek Z-12 w ciągu ${d.funeralMonths} miesięcy, także przy martwym urodzeniu (karta martwego urodzenia).`,
      who: "oboje",
      severity: "danger",
      kind: "swiadczenia",
      legal: [{ act: "ustawa emerytalna", article: "art. 77–80" }],
    });
  }

  list.push({
    id: "prescription",
    date: addMonths(ctx.maternityEnd, d.claimPrescriptionMonths),
    title: "Przedawnienie roszczeń zasiłkowych",
    description: `Zasiłek nie przysługuje, jeśli wniosek złożysz po ${d.claimPrescriptionMonths} miesiącach od końca okresu, za który się należy (${d.claimPrescriptionErrorYears} lata – gdy winny jest płatnik lub ZUS).`,
    who: "oboje",
    severity: "danger",
    kind: "przedawnienie",
    legal: [{ act: "ustawa zasiłkowa", article: "art. 67" }],
  });

  return list
    .map((x) => ({ ...x, daysLeft: diffDays(input.asOf, x.date) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
