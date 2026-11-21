/**
 * Parametry legislacyjne (stan prawny 2026 r.).
 * Wszystkie wartości są edytowalne w Panelu Administracyjnym (Moduł 9) –
 * silnik obliczeniowy NIGDY nie używa liczb „na sztywno”, tylko tej struktury.
 */
export interface LegalConfig {
  version: string;
  updatedAt: string;
  year: number;

  /** Płaca minimalna brutto (rozporządzenie RM na 2026 r.) */
  minWage: number;
  /** Odliczenie składek społecznych finansowanych przez ubezpieczonego (art. 3 pkt 3–4 ustawy zasiłkowej) */
  socialContributionRate: number;
  /** Maks. miesięczna podstawa dobrowolnej składki chorobowej (250% prognozowanego przeciętnego wynagrodzenia) */
  maxVoluntarySicknessBase: number;
  /** Najniższa podstawa składek JDG – 60% prognozowanego przeciętnego wynagrodzenia (art. 18 ust. 8 u.s.u.s.) */
  jdgMinBase: number;
  /** Preferencyjna podstawa – 30% płacy minimalnej (art. 18a u.s.u.s.) */
  jdgPreferentialBase: number;

  /** Próg zadłużenia JDG blokujący zasiłki – ułamek płacy minimalnej (art. 2a) */
  debtThresholdRate: number;
  /** Przedawnienie prawa przy zadłużeniu (art. 2a ust. 2) – miesiące */
  debtPrescriptionMonths: number;
  /** Próg „dużego płatnika” (art. 61 ust. 1 pkt 1) – liczba ubezpieczonych na 30 listopada */
  largePayerThreshold: number;

  rates: {
    sicknessPregnancy: number; // kod B
    sicknessStandard: number;
    rehabPregnancy: number;
    maternity: number; // macierzyński / na warunkach / uzupełniający / ojcowski
    parental: number; // rodzicielski
    combined: number; // wniosek w 21 dni (art. 30a + art. 31 ust. 3)
    nonTransferable: number; // 9 tyg. drugiego rodzica (art. 31 ust. 3f)
    care: number; // opiekuńczy
    employerSickPay: number; // wynagrodzenie chorobowe w ciąży (art. 92 KP)
  };

  leave: {
    /** Urlop macierzyński wg liczby dzieci: [1,2,3,4,5+] (art. 180 § 1 KP) */
    maternityWeeks: number[];
    maternityMinMotherWeeks: number;
    maternitySpecialWeeks: number; // martwe urodzenie / zgon dziecka (art. 180¹ KP)
    maternityMaxBeforeBirthWeeks: number;
    adoptionMinWeeks: number;
    adoptionMaxChildAgeFoster: number;
    adoptionMaxChildAgeFosterDeferred: number;
    adoptionMaxChildAge: number;
    parentalWeeks: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number };
    parentalAfterMinAdoption: { single: number; multiple: number }; // gdy urlop na warunkach = 9 tyg.
    parentalMaxExtended: { single: number; multiple: number; zaZyciemSingle: number; zaZyciemMultiple: number };
    nonTransferableWeeks: number;
    parentalMaxParts: number;
    parentalMaxWorkFraction: number;
    paternityWeeks: number;
    paternityMaxChildAgeMonths: number;
    supplementaryMaxSevere: number; // < 28 tyg. lub ≤ 1000 g
    supplementaryMaxModerate: number; // 28–37 tyg. lub > 37 tyg. z hospitalizacją
    supplementaryWeightThresholdG: number;
    employerSickDays: number;
    employerSickDays50: number;
    sicknessPeriodDays: number;
    sicknessBreakMergeDays: number; // przerwa ≤ 60 dni – jeden okres zasiłkowy
    rehabMaxMonths: number;
    stillbirthMinDaysAfterDeath: number;
  };

  waiting: {
    mandatoryDays: number;
    voluntaryDays: number;
    breakToleranceDays: number;
    graduateDays: number;
    mandatoryYearsException: number;
  };

  care: {
    childDays: number; // dziecko do 14 lat (60)
    childOver14Days: number; // dziecko 14–18 lat (30)
    otherFamilyDays: number; // inny członek rodziny (14)
    totalMaxDays: number; // łącznie 60
  };

  amounts: {
    funeralGrant: number;
    parentalBenefit: number; // świadczenie rodzicielskie (tzw. kosiniakowe)
    parentalBenefitWeeks: number[]; // 52 / 65 / 67 / 69 / 71 tyg.
    becikowe: number;
    becikoweIncomeLimit: number;
    family800: number;
    aktywnyRodzicWork: number;
    aktywnyRodzicNursery: number;
    aktywnyRodzicHome: number;
    pitAdvanceRate: number;
  };

  deadlines: {
    combinedApplicationDays: number; // 21 dni po porodzie
    leaveApplicationDaysBefore: number; // 21 dni przed
    maternityBeforeBirthApplicationDays: number; // 14 dni przed
    usCRegistrationDays: number; // 21 dni od karty urodzenia
    healthInsuranceDays: number; // 7 dni od PESEL
    family800RetroMonths: number; // 3 mies.
    becikoweMonths: number; // 12 mies.
    claimPrescriptionMonths: number; // art. 67 – 6 mies.
    claimPrescriptionErrorYears: number; // 3 lata – błąd płatnika/ZUS
    funeralMonths: number; // 12 mies.
  };
}

export const DEFAULT_LEGAL_CONFIG_2026: LegalConfig = {
  version: "2026.11-zus",
  updatedAt: "2026-10-24T00:00:00.000Z",
  year: 2026,
  minWage: 4806,
  socialContributionRate: 0.1371,
  maxVoluntarySicknessBase: 23550,
  jdgMinBase: 5652,
  jdgPreferentialBase: 1441.8,
  debtThresholdRate: 0.01,
  debtPrescriptionMonths: 6,
  largePayerThreshold: 20,
  rates: {
    sicknessPregnancy: 1,
    sicknessStandard: 0.8,
    rehabPregnancy: 1,
    maternity: 1,
    parental: 0.7,
    combined: 0.815,
    nonTransferable: 0.7,
    care: 0.8,
    employerSickPay: 1,
  },
  leave: {
    maternityWeeks: [20, 31, 33, 35, 37],
    maternityMinMotherWeeks: 14,
    maternitySpecialWeeks: 8,
    maternityMaxBeforeBirthWeeks: 6,
    adoptionMinWeeks: 9,
    adoptionMaxChildAgeFoster: 7,
    adoptionMaxChildAgeFosterDeferred: 10,
    adoptionMaxChildAge: 14,
    parentalWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
    parentalAfterMinAdoption: { single: 38, multiple: 62 },
    parentalMaxExtended: { single: 82, multiple: 86, zaZyciemSingle: 130, zaZyciemMultiple: 134 },
    nonTransferableWeeks: 9,
    parentalMaxParts: 5,
    parentalMaxWorkFraction: 0.5,
    paternityWeeks: 2,
    paternityMaxChildAgeMonths: 12,
    supplementaryMaxSevere: 15,
    supplementaryMaxModerate: 8,
    supplementaryWeightThresholdG: 1000,
    employerSickDays: 33,
    employerSickDays50: 14,
    sicknessPeriodDays: 270,
    sicknessBreakMergeDays: 60,
    rehabMaxMonths: 12,
    stillbirthMinDaysAfterDeath: 7,
  },
  waiting: {
    mandatoryDays: 30,
    voluntaryDays: 90,
    breakToleranceDays: 30,
    graduateDays: 90,
    mandatoryYearsException: 10,
  },
  care: { childDays: 60, childOver14Days: 30, otherFamilyDays: 14, totalMaxDays: 60 },
  amounts: {
    funeralGrant: 7000,
    parentalBenefit: 1000,
    parentalBenefitWeeks: [52, 65, 67, 69, 71],
    becikowe: 1000,
    becikoweIncomeLimit: 1922,
    family800: 800,
    aktywnyRodzicWork: 1500,
    aktywnyRodzicNursery: 1500,
    aktywnyRodzicHome: 500,
    pitAdvanceRate: 0.12,
  },
  deadlines: {
    combinedApplicationDays: 21,
    leaveApplicationDaysBefore: 21,
    maternityBeforeBirthApplicationDays: 14,
    usCRegistrationDays: 21,
    healthInsuranceDays: 7,
    family800RetroMonths: 3,
    becikoweMonths: 12,
    claimPrescriptionMonths: 6,
    claimPrescriptionErrorYears: 3,
    funeralMonths: 12,
  },
};

/** Opis pól do Panelu Administracyjnego (etykieta, podstawa prawna, jednostka). */
export interface ConfigFieldMeta {
  path: string;
  label: string;
  legal: string;
  unit: "zł" | "%" | "tyg." | "dni" | "mies." | "os." | "lat";
  group: "Kwoty bazowe" | "Stawki zasiłków" | "Wymiary urlopów" | "Okresy i limity" | "Świadczenia rodzinne";
}

export const CONFIG_FIELDS: ConfigFieldMeta[] = [
  { path: "minWage", label: "Płaca minimalna brutto", legal: "Rozp. RM z 2025 r. (na 2026 r.)", unit: "zł", group: "Kwoty bazowe" },
  { path: "socialContributionRate", label: "Odliczenie składek społecznych", legal: "art. 3 pkt 3–4 ustawy zasiłkowej", unit: "%", group: "Kwoty bazowe" },
  { path: "maxVoluntarySicknessBase", label: "Maks. podstawa dobrowolnej składki chorobowej", legal: "art. 20 ust. 3 u.s.u.s.", unit: "zł", group: "Kwoty bazowe" },
  { path: "jdgMinBase", label: "Najniższa podstawa JDG (60% prognozy)", legal: "art. 18 ust. 8 u.s.u.s.", unit: "zł", group: "Kwoty bazowe" },
  { path: "jdgPreferentialBase", label: "Podstawa preferencyjna (30% płacy min.)", legal: "art. 18a u.s.u.s.", unit: "zł", group: "Kwoty bazowe" },
  { path: "debtThresholdRate", label: "Próg zadłużenia JDG (część płacy min.)", legal: "art. 2a ust. 1", unit: "%", group: "Kwoty bazowe" },
  { path: "largePayerThreshold", label: "Próg płatnika wypłacającego zasiłki", legal: "art. 61 ust. 1 pkt 1", unit: "os.", group: "Kwoty bazowe" },

  { path: "rates.sicknessPregnancy", label: "Zasiłek chorobowy w ciąży (kod B)", legal: "art. 11 ust. 2 pkt 2", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.rehabPregnancy", label: "Świadczenie rehabilitacyjne w ciąży", legal: "art. 19 ust. 2", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.maternity", label: "Macierzyński / uzupełniający / ojcowski", legal: "art. 31 ust. 1", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.parental", label: "Rodzicielski", legal: "art. 31 ust. 2", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.combined", label: "Wariant łączny (wniosek w 21 dni)", legal: "art. 31 ust. 3", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.nonTransferable", label: "Niezbywalne 9 tyg. drugiego rodzica", legal: "art. 31 ust. 3f", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.care", label: "Zasiłek opiekuńczy", legal: "art. 35 ust. 1", unit: "%", group: "Stawki zasiłków" },
  { path: "rates.sicknessStandard", label: "Zasiłek chorobowy (standard)", legal: "art. 11 ust. 1", unit: "%", group: "Stawki zasiłków" },

  { path: "leave.maternityWeeks.0", label: "Macierzyński – 1 dziecko", legal: "art. 180 § 1 pkt 1 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.maternityWeeks.1", label: "Macierzyński – 2 dzieci", legal: "art. 180 § 1 pkt 2 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.maternityWeeks.2", label: "Macierzyński – 3 dzieci", legal: "art. 180 § 1 pkt 3 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.maternityWeeks.3", label: "Macierzyński – 4 dzieci", legal: "art. 180 § 1 pkt 4 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.maternityWeeks.4", label: "Macierzyński – 5+ dzieci", legal: "art. 180 § 1 pkt 5 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.parentalWeeks.single", label: "Rodzicielski – 1 dziecko", legal: "art. 182¹a § 1 pkt 1 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.parentalWeeks.multiple", label: "Rodzicielski – 2+ dzieci", legal: "art. 182¹a § 1 pkt 2 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.parentalWeeks.zaZyciemSingle", label: "Rodzicielski „Za życiem” – 1 dziecko", legal: "art. 182¹a § 2 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.parentalWeeks.zaZyciemMultiple", label: "Rodzicielski „Za życiem” – 2+ dzieci", legal: "art. 182¹a § 2 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.nonTransferableWeeks", label: "Część niezbywalna rodzicielskiego", legal: "art. 182¹a § 4 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.paternityWeeks", label: "Urlop ojcowski", legal: "art. 182³ KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.maternityMinMotherWeeks", label: "Min. macierzyński matki po porodzie", legal: "art. 180 § 4 KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.supplementaryMaxSevere", label: "Uzupełniający – limit (< 28 tyg. / ≤ 1000 g)", legal: "art. 180² KP", unit: "tyg.", group: "Wymiary urlopów" },
  { path: "leave.supplementaryMaxModerate", label: "Uzupełniający – limit (pozostałe)", legal: "art. 180² KP", unit: "tyg.", group: "Wymiary urlopów" },

  { path: "leave.sicknessPeriodDays", label: "Okres zasiłkowy w ciąży", legal: "art. 8", unit: "dni", group: "Okresy i limity" },
  { path: "leave.employerSickDays", label: "Wynagrodzenie chorobowe od pracodawcy", legal: "art. 92 § 1 KP", unit: "dni", group: "Okresy i limity" },
  { path: "leave.employerSickDays50", label: "Wynagrodzenie chorobowe – pracownik 50+", legal: "art. 92 § 1 KP", unit: "dni", group: "Okresy i limity" },
  { path: "waiting.mandatoryDays", label: "Okres wyczekiwania – obowiązkowe", legal: "art. 4 ust. 1 pkt 1", unit: "dni", group: "Okresy i limity" },
  { path: "waiting.voluntaryDays", label: "Okres wyczekiwania – dobrowolne", legal: "art. 4 ust. 1 pkt 2", unit: "dni", group: "Okresy i limity" },
  { path: "care.childDays", label: "Opiekuńczy – dziecko do 14 lat", legal: "art. 33 ust. 1 pkt 1", unit: "dni", group: "Okresy i limity" },
  { path: "care.childOver14Days", label: "Opiekuńczy – dziecko 14–18 lat", legal: "art. 33 ust. 1a", unit: "dni", group: "Okresy i limity" },
  { path: "care.otherFamilyDays", label: "Opiekuńczy – inny członek rodziny", legal: "art. 33 ust. 1 pkt 2", unit: "dni", group: "Okresy i limity" },
  { path: "deadlines.combinedApplicationDays", label: "Termin wniosku o 81,5%", legal: "art. 30a ust. 1", unit: "dni", group: "Okresy i limity" },
  { path: "deadlines.claimPrescriptionMonths", label: "Przedawnienie roszczeń zasiłkowych", legal: "art. 67 ust. 1 pkt 2", unit: "mies.", group: "Okresy i limity" },

  { path: "amounts.parentalBenefit", label: "Świadczenie rodzicielskie (próg podwyższenia)", legal: "art. 31 ust. 3a; u.ś.r.", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.funeralGrant", label: "Zasiłek pogrzebowy", legal: "art. 80 ustawy emerytalnej", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.becikowe", label: "Becikowe", legal: "art. 15b u.ś.r.", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.becikoweIncomeLimit", label: "Kryterium dochodowe becikowego (na os.)", legal: "art. 15b ust. 2 u.ś.r.", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.family800", label: "Rodzina 800+ (na dziecko)", legal: "ustawa o pomocy państwa w wychowywaniu dzieci", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.aktywnyRodzicWork", label: "Aktywny Rodzic – aktywnie w pracy", legal: "ustawa o wspieraniu rodziców (2024)", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.aktywnyRodzicNursery", label: "Aktywny Rodzic – w żłobku (maks.)", legal: "ustawa o wspieraniu rodziców (2024)", unit: "zł", group: "Świadczenia rodzinne" },
  { path: "amounts.aktywnyRodzicHome", label: "Aktywny Rodzic – w domu", legal: "ustawa o wspieraniu rodziców (2024)", unit: "zł", group: "Świadczenia rodzinne" },
];
