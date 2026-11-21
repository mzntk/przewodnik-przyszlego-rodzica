/**
 * Zintegrowany, deterministyczny Silnik Uprawnień i Kalkulator.
 * Wejście: CaseInput + LegalConfig → Wyjście: CalculationResult.
 * Ten moduł NIE korzysta z AI – każda liczba wynika wprost z przepisów i konfiguracji.
 */
import type { LegalConfig } from "@/models/legal-config";
import type { CalculationResult, CaseInput, Finding } from "@/models/types";
import { computeBase, isDeclaredBaseTitle } from "./base";
import { evaluateEligibility } from "./eligibility";
import { analyzeSickness } from "./sickness";
import { buildLeaveSegments, compareVariants } from "./maternity";
import { buildDeadlines } from "./deadlines";
import { familyBenefits } from "./family";
import { addDays, addMonths, diffDays, formatDatePL, round2 } from "./dates";

export function calculate(input: CaseInput, cfg: LegalConfig): CalculationResult {
  const { mother, father, child, plan } = input;
  const event = child.birthDate ?? child.dueDate;

  // Dzień powstania prawa do zasiłku macierzyńskiego = dzień porodu / przyjęcia (lub start przed porodem)
  const rightDate = child.path === "biologiczny" ? addDays(event, -Math.min(plan.maternityStartBeforeBirthWeeks, cfg.leave.maternityMaxBeforeBirthWeeks) * 7) : event;
  const firstSick = [...mother.sickLeaves].sort((a, b) => a.from.localeCompare(b.from))[0]?.from;

  const motherElig = evaluateEligibility(mother, rightDate, cfg, "macierzynski");
  // Podstawa zasiłku chorobowego – z 12 mies. przed pierwszym zwolnieniem
  const sicknessBase = computeBase(mother, firstSick && firstSick < rightDate ? firstSick : rightDate, cfg);
  const sickElig = evaluateEligibility(mother, firstSick ?? rightDate, cfg, "chorobowy");
  const sickness = analyzeSickness(mother, sicknessBase, sickElig, cfg);
  // Podstawa zasiłku macierzyńskiego – zasada ciągłości (art. 43): przerwa < 1 mies. → bez przeliczenia
  const lastSickEnd = [...mother.sickLeaves].sort((a, b) => b.to.localeCompare(a.to))[0]?.to;
  const motherBase = firstSick && firstSick < rightDate && sicknessBase.method !== "brak"
    ? computeBase({ ...mother, previousBenefitBase: mother.previousBenefitBase ?? sicknessBase.base, previousBenefitEnd: mother.previousBenefitEnd ?? lastSickEnd }, rightDate, cfg)
    : computeBase(mother, rightDate, cfg);

  const fatherElig = father ? evaluateEligibility(father, event, cfg, "macierzynski") : undefined;
  const fatherBase = father ? computeBase(father, event, cfg) : undefined;

  const built = buildLeaveSegments({ input, cfg, motherBase, fatherBase, motherElig, fatherElig });
  const segments = [...sickness.segments, ...built.segments];

  // Zasiłek w wysokości zasiłku macierzyńskiego (art. 30 ust. 3) – od utraty pracy do porodu
  if (sickness.maternityLevelBenefit.applies && mother.contractEndDate && mother.contractEndDate < event) {
    const from = addDays(mother.contractEndDate, 1);
    const to = addDays(event, -1);
    const days = diffDays(from, to) + 1;
    if (days > 0) {
      const daily = round2(motherBase.dailyBase * cfg.rates.maternity);
      segments.push({
        id: "wwm",
        kind: "w_wysokosci_macierzynskiego",
        label: "Zasiłek w wysokości zasiłku macierzyńskiego (do porodu)",
        who: "matka",
        payer: "zus",
        from,
        to,
        days,
        weeks: round2(days / 7),
        rate: cfg.rates.maternity,
        dailyAmount: daily,
        monthlyAmount: round2(daily * 30),
        total: round2(daily * days),
        legal: [{ act: "ustawa zasiłkowa", article: "art. 30 ust. 3" }],
      });
    }
  }

  // Zasiłek opiekuńczy
  let care: CalculationResult["care"];
  if (input.care?.enabled) {
    const c = input.care;
    const limit = c.type === "dziecko_do_14" ? cfg.care.childDays : c.type === "dziecko_14_18" ? cfg.care.childOver14Days : cfg.care.otherFamilyDays;
    const allowed = Math.max(0, Math.min(c.days, limit - c.usedThisYear, cfg.care.totalMaxDays - c.usedThisYear));
    const daily = round2(motherBase.dailyBase * cfg.rates.care);
    care = {
      days: c.days,
      allowed,
      daily,
      total: round2(daily * allowed),
      form: c.type === "inny_czlonek" ? "Z-15B" : "Z-15A",
      note: `Limit roczny ${limit} dni (łącznie maks. ${cfg.care.totalMaxDays} dni na wszystkie tytuły opieki). Zasiłek opiekuńczy nie ma okresu wyczekiwania – przysługuje od 1. dnia ubezpieczenia.`,
    };
  }

  const motherTotal = round2(segments.filter((s) => s.who === "matka").reduce((s, x) => s + x.total, 0));
  const fatherTotal = round2(segments.filter((s) => s.who === "ojciec").reduce((s, x) => s + x.total, 0));
  const matSeg = built.segments.find((s) => s.id === "mat-m");

  const variants = compareVariants(motherBase.dailyBase, matSeg?.days ?? built.meta.maternityWeeks * 7, built.meta.motherParentalWeeks * 7, cfg, child);

  const motherParStart = addDays(built.meta.maternityEnd, 1 + built.meta.supplementaryWeeks * 7);
  const workSeg = built.segments.find((s) => s.kind === "rodzicielski_praca");
  const deadlines = buildDeadlines(input, cfg, {
    maternityEnd: built.meta.maternityEnd,
    motherParentalStart: motherParStart,
    motherInsured: motherElig.insured,
    fatherInsured: !!fatherElig?.insured,
    combineWorkStart: workSeg?.from,
    payerIsZus: motherElig.payer.payer === "zus",
    isJdg: isDeclaredBaseTitle(mother.title),
  });

  const family = familyBenefits(input, cfg, { motherInsured: motherElig.insured, fatherInsured: !!fatherElig?.insured });
  const findings = buildFindings(input, cfg, { motherElig, fatherElig, motherBase, sickness, built, segments, rightDate });

  const allDates = segments.flatMap((s) => [s.from, s.to]).sort();
  return {
    configVersion: cfg.version,
    computedAt: new Date().toISOString(),
    mother: { eligibility: motherElig, base: motherBase, sicknessBase, sickness },
    father: father && fatherElig && fatherBase ? { eligibility: fatherElig, base: fatherBase } : undefined,
    leave: {
      maternityWeeks: built.meta.maternityWeeks,
      maternityMinMotherWeeks: child.stillbirth ? cfg.leave.maternitySpecialWeeks : cfg.leave.maternityMinMotherWeeks,
      supplementaryWeeks: built.meta.supplementaryWeeks,
      supplementaryReason: built.meta.supplementaryReason,
      parentalWeeks: built.meta.parentalWeeks,
      parentalExtendedWeeks: built.meta.parentalExtendedWeeks,
      parentalExtensionDays: built.meta.parentalExtensionDays,
      nonTransferableWeeks: built.meta.nonTransferableWeeks,
      paternityWeeks: built.meta.paternityWeeks,
      adoptionNote: built.meta.adoptionNote,
      totalFamilyWeeks: round2(built.meta.maternityWeeks + built.meta.supplementaryWeeks + (built.meta.motherParentalWeeks + built.meta.fatherParentalWeeks) + built.meta.parentalExtensionDays / 7),
    },
    segments: segments.sort((a, b) => a.from.localeCompare(b.from)),
    totals: { mother: motherTotal, father: fatherTotal, family: round2(motherTotal + fatherTotal), monthlyMotherFirst: matSeg?.monthlyAmount ?? 0 },
    variants,
    care,
    familyBenefits: family,
    deadlines,
    findings,
    timelineStart: allDates[0] ?? event,
    timelineEnd: allDates.at(-1) ?? addMonths(event, 12),
  };
}

function buildFindings(
  input: CaseInput,
  cfg: LegalConfig,
  x: {
    motherElig: ReturnType<typeof evaluateEligibility>;
    fatherElig?: ReturnType<typeof evaluateEligibility>;
    motherBase: ReturnType<typeof computeBase>;
    sickness: ReturnType<typeof analyzeSickness>;
    built: ReturnType<typeof buildLeaveSegments>;
    segments: CalculationResult["segments"];
    rightDate: string;
  },
): Finding[] {
  const f: Finding[] = [];
  const { mother, father, child, plan } = input;
  const event = child.birthDate ?? child.dueDate;
  const voluntary = ["zlecenie", "jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(mother.title);

  // --- Blokada zadłużenia (art. 2a)
  if (x.motherElig.debtBlock.blocked) {
    f.push({
      id: "debt",
      severity: "danger",
      title: `Zadłużenie ${x.motherElig.debtBlock.debt.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł blokuje wypłatę zasiłków`,
      message: `Zadłużenie przekracza 1% płacy minimalnej (${x.motherElig.debtBlock.threshold.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł). Zasiłek nie będzie wypłacany do spłaty CAŁOŚCI długu. Jeśli nie spłacisz do ${formatDatePL(x.motherElig.debtBlock.expiresOn!)}, prawo do zasiłku przedawni się.`,
      legal: [{ act: "ustawa zasiłkowa", article: "art. 2a ust. 1–2" }],
      action: { label: "Zobacz zaświadczenie o niezaleganiu", href: "/ustawienia#zus" },
    });
  }

  // --- Brak ubezpieczenia → świadczenie rodzicielskie
  if (!x.motherElig.insured) {
    f.push({
      id: "no-insurance",
      severity: "danger",
      title: "Brak ubezpieczenia chorobowego – brak zasiłku macierzyńskiego",
      message: `${x.motherElig.reason} Przysługuje świadczenie rodzicielskie ${cfg.amounts.parentalBenefit} zł/mies. (tzw. kosiniakowe) z gminy.`,
      legal: x.motherElig.legal,
      action: { label: "Policz świadczenie rodzicielskie", href: "/kalkulator?tab=rodzinne" },
    });
  }

  // --- Wyrejestrowanie z dobrowolnego chorobowego
  if (voluntary && x.motherElig.insured) {
    f.push({
      id: "zua",
      severity: "warning",
      title: "Po zasiłku macierzyńskim zgłoś się ponownie do ubezpieczenia (ZUS ZUA)",
      message: "Na czas pobierania zasiłku macierzyńskiego obowiązek składek z działalności/zlecenia jest zawieszony, a dobrowolne ubezpieczenie chorobowe ustaje. Po zakończeniu zasiłku złóż ponownie ZUS ZUA z kodem dobrowolnego chorobowego – inaczej stracisz ochronę (np. zasiłek opiekuńczy).",
      legal: [{ act: "u.s.u.s.", article: "art. 14" }],
    });
  }

  // --- Ryzyko kontroli: tytuł powstały w ciąży / pozorna umowa
  const conception = addDays(child.dueDate, -280);
  if (mother.insuranceStart > conception && x.motherElig.insured) {
    f.push({
      id: "sham",
      severity: "warning",
      title: "Ubezpieczenie powstało w trakcie ciąży – możliwa kontrola ZUS",
      message: "ZUS może zbadać, czy umowa/działalność jest faktycznie wykonywana (a nie zawarta dla pozoru). Przygotuj dowody realnej pracy: faktury, korespondencję, zakres obowiązków, ewidencję czasu.",
      legal: [{ act: "u.s.u.s.", article: "art. 83 ust. 1" }],
    });
  }

  // --- Sztuczne zawyżenie podstawy
  const hist = [...mother.incomeHistory].sort((a, b) => a.month.localeCompare(b.month));
  if (hist.length >= 6) {
    const last3 = hist.slice(-3).reduce((s, m) => s + m.gross, 0) / 3;
    const prev = hist.slice(0, -3).reduce((s, m) => s + m.gross, 0) / (hist.length - 3);
    if (prev > 0 && last3 > prev * 1.5) {
      f.push({
        id: "inflated",
        severity: "warning",
        title: `Podstawa wzrosła o ${Math.round((last3 / prev - 1) * 100)}% w ostatnich miesiącach`,
        message: "Gwałtowne podwyższenie podstawy składek w ciąży bywa weryfikowane przez ZUS – może zostać wydana decyzja o niższej podstawie. Zachowaj uzasadnienie (awans, nowy kontrakt, wzrost przychodów).",
        legal: [{ act: "u.s.u.s.", article: "art. 41 ust. 12–13" }],
      });
    }
  }

  // --- Praca podczas e-ZLA
  if (mother.sickLeaves.length) {
    f.push({
      id: "ezla-work",
      severity: "danger",
      title: "Nie pracuj zarobkowo w czasie zwolnienia lekarskiego",
      message: "Wykonywanie pracy zarobkowej (także zdalnie, na rzecz innego zleceniodawcy, czy w JDG) albo wykorzystywanie zwolnienia niezgodnie z celem oznacza utratę zasiłku za CAŁY okres zwolnienia.",
      legal: [{ act: "ustawa zasiłkowa", article: "art. 17 ust. 1" }],
    });
  }
  if (x.sickness.resetByCodeB) {
    f.push({
      id: "codeB-reset",
      severity: "success",
      title: "Nowy okres zasiłkowy – zwolnienie z kodem „B” po przerwie",
      message: `Okresy sprzed przerwy nie wliczają się do limitu ${cfg.leave.sicknessPeriodDays} dni, bo niezdolność po przerwie przypada w ciąży.`,
      legal: [{ act: "ustawa zasiłkowa", article: "art. 9 ust. 2" }],
    });
  }
  if (x.sickness.waitingDaysUnpaid > 0 && x.motherElig.insured) {
    f.push({
      id: "waiting",
      severity: "warning",
      title: `${x.sickness.waitingDaysUnpaid} dni zwolnienia w okresie wyczekiwania – bez zasiłku`,
      message: `Prawo do zasiłku chorobowego powstaje po ${x.motherElig.waitingPeriod.required} dniach nieprzerwanego ubezpieczenia. Zasiłek macierzyński NIE ma okresu wyczekiwania.`,
      legal: [{ act: "ustawa zasiłkowa", article: "art. 4 ust. 1" }],
    });
  }

  // --- Umowa na czas określony
  if (mother.contractEndDate && mother.contractEndDate < event) {
    if (mother.title === "uop") {
      f.push({
        id: "art177",
        severity: "success",
        title: "Umowa terminowa przedłuży się do dnia porodu",
        message: "Umowa na czas określony (lub na okres próbny > 1 mies.), która miałaby się rozwiązać po upływie 3. miesiąca ciąży, ulega przedłużeniu do dnia porodu. Zasiłek macierzyński przysługuje także po ustaniu zatrudnienia.",
        legal: [{ act: "Kodeks pracy", article: "art. 177 § 3" }, { act: "ustawa zasiłkowa", article: "art. 30 ust. 4" }],
      });
    } else {
      f.push({
        id: "contract-end",
        severity: "danger",
        title: "Zakończenie umowy/działalności przed porodem = utrata zasiłku",
        message: "Ochrona z art. 177 KP dotyczy tylko pracowników. Jeśli tytuł ubezpieczenia ustanie przed porodem, zasiłek macierzyński nie przysługuje.",
        legal: [{ act: "ustawa zasiłkowa", article: "art. 29 ust. 1" }],
      });
    }
  }

  // --- 81,5% / wyrównanie
  if (x.motherElig.insured && plan.variant === "combined") {
    f.push({
      id: "equalization",
      severity: "gold",
      title: "Wyrównanie do 100% przy niewykorzystaniu rodzicielskiego",
      message: `Jeśli w 1. roku życia dziecka nie wykorzystasz ani dnia rodzicielskiego, przysługuje jednorazowe wyrównanie macierzyńskiego do 100% (ok. ${compareEq(x, cfg.rates.maternity - cfg.rates.combined)} zł) – na wniosek.`,
      legal: [{ act: "ustawa zasiłkowa", article: "art. 31 ust. 4" }],
    });
  }
  if (x.segments.some((s) => s.raisedToParentalBenefit)) {
    f.push({
      id: "raise",
      severity: "gold",
      title: `Zasiłek podwyższony do ${cfg.amounts.parentalBenefit} zł miesięcznie`,
      message: "Wyliczona kwota zasiłku macierzyńskiego była niższa niż świadczenie rodzicielskie – ZUS podwyższa ją automatycznie (dopłata z budżetu państwa).",
      legal: [{ act: "ustawa zasiłkowa", article: "art. 31 ust. 3a" }],
    });
  }

  // --- Niezbywalne 9 tygodni
  const nt = cfg.leave.nonTransferableWeeks;
  if (x.built.meta.parentalWeeks > 0 && x.built.meta.fatherParentalWeeks < nt) {
    f.push({
      id: "nt-lost",
      severity: father ? "gold" : "info",
      title: `${nt - x.built.meta.fatherParentalWeeks} tyg. urlopu rodzicielskiego przepadnie`,
      message: `Każdemu rodzicowi przysługuje wyłączne ${nt} tygodni rodzicielskiego – nie da się ich przenieść. ${father ? "Zaplanuj je dla taty (70% jego podstawy)." : "Matka może wykorzystać maks. " + (x.built.meta.parentalWeeks - nt) + " tyg."}`,
      legal: [{ act: "Kodeks pracy", article: "art. 182¹a § 4" }],
      action: father ? { label: "Zaplanuj podział urlopu", href: "/kalkulator?tab=podzial" } : undefined,
    });
  }
  if (plan.parentalParts > cfg.leave.parentalMaxParts) {
    f.push({
      id: "parts",
      severity: "warning",
      title: `Maksymalnie ${cfg.leave.parentalMaxParts} części urlopu rodzicielskiego`,
      message: "Każdy wniosek (także o zasiłek za część rodzicielskiego) liczy się jako osobna część. Wykorzystaj do końca roku, w którym dziecko kończy 6 lat.",
      legal: [{ act: "Kodeks pracy", article: "art. 182¹c" }],
    });
  }
  if (plan.combineWithWork.enabled && plan.combineWithWork.fraction > cfg.leave.parentalMaxWorkFraction) {
    f.push({
      id: "work-frac",
      severity: "warning",
      title: "Łączenie z pracą – maks. 1/2 etatu",
      message: "Przyjęto 1/2 etatu. Praca w wyższym wymiarze wyklucza łączenie z urlopem rodzicielskim.",
      legal: [{ act: "Kodeks pracy", article: "art. 182¹e § 1" }],
    });
  }

  // --- Wykluczające się świadczenia
  f.push({
    id: "exclusive",
    severity: "info",
    title: "Świadczenia wzajemnie się wykluczające",
    message: "Zasiłek macierzyński wyklucza świadczenie rodzicielskie (kosiniakowe) za ten sam okres. W programie Aktywny Rodzic możesz pobierać tylko jedną z trzech opcji naraz.",
    legal: [{ act: "u.ś.r.", article: "art. 17c ust. 6" }, { act: "ustawa o wspieraniu rodziców", article: "art. 5" }],
  });

  // --- Uproszczenie § 13 ust. 2
  if (x.motherElig.insured && x.motherElig.payer.payer === "zus") {
    f.push({
      id: "par13",
      severity: "success",
      title: "Nie musisz dostarczać odpisu aktu urodzenia",
      message: "Gdy zasiłek wypłaca ZUS, sam pobiera dane z rejestru stanu cywilnego – nie dołączaj odpisu skróconego aktu urodzenia.",
      legal: [{ act: "rozporządzenie 27.09.2026", article: "§ 13 ust. 2" }],
    });
  }

  // --- Zbieg tytułów
  if (mother.secondaryTitles?.length) {
    f.push({
      id: "zbieg",
      severity: "info",
      title: "Zbieg tytułów ubezpieczenia",
      message: "Przy kilku tytułach zasiłek przysługuje z każdego, z którego podlegasz ubezpieczeniu chorobowemu (podstawy ustala się odrębnie). Zlecenie u własnego pracodawcy traktowane jest jak umowa o pracę. Od 2027 r. jeden okres zasiłkowy niezależnie od liczby tytułów.",
      legal: [{ act: "ustawa zasiłkowa", article: "art. 9 ust. 4" }],
    });
  }

  if (child.zaZyciem) {
    f.push({
      id: "zazyciem",
      severity: "info",
      title: "Zaświadczenie „Za życiem” wydłuża urlop rodzicielski",
      message: `Rodzicielski: ${child.childrenCount > 1 ? cfg.leave.parentalWeeks.zaZyciemMultiple : cfg.leave.parentalWeeks.zaZyciemSingle} tyg. Dołącz zaświadczenie lekarza specjalisty do wniosku.`,
      legal: [{ act: "Kodeks pracy", article: "art. 182¹a § 2" }],
    });
  }
  if (father && x.fatherElig && !x.fatherElig.insured) {
    f.push({
      id: "father-noins",
      severity: "warning",
      title: "Tata nie podlega ubezpieczeniu chorobowemu",
      message: "Bez ubezpieczenia chorobowego tata nie otrzyma zasiłku za urlop ojcowski ani za swoje 9 tygodni rodzicielskiego.",
      legal: x.fatherElig.legal,
    });
  }
  return f;
}

function compareEq(x: { motherBase: { dailyBase: number }; built: { segments: { id: string; days: number }[] } }, gap: number): string {
  const days = x.built.segments.find((s) => s.id === "mat-m")?.days ?? 0;
  return round2(x.motherBase.dailyBase * gap * days).toLocaleString("pl-PL");
}

export { computeBase, evaluateEligibility };
