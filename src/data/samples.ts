/**
 * Zanonimizowane sprawy testowe (PDF w /public/samples, generowane skryptem scripts/generate-samples.ts).
 * Dane fikcyjne – służą do demonstracji walidatora i silnika w warunkach testowych.
 */
export interface SampleCase {
  id: string;
  file: string;
  form: string;
  person: string;
  summary: string;
  expected: string;
  tone: "green" | "red" | "orange" | "blue" | "gold";
  /** Dokumenty jednej sprawy (teczka) mają ten sam klucz – analizujemy je razem. */
  caseKey: string;
}

/** Teczki spraw testowych: kilka dokumentów jednej osoby analizowanych razem (jak w zestawach ZUS). */
export const SAMPLE_SETS = [
  { key: "anna", title: "Anna Kowalczyk – etat w małej firmie", summary: "ZAM + Z-3: wniosek i zaświadczenie pracodawcy z 12 miesiącami wynagrodzeń.", expected: "Ubezpieczona – zasiłek wypłaca ZUS, podstawa z Z-3", tone: "green" },
  { key: "magda", title: "Magdalena Wiśniewska – własna firma", summary: "Poświadczenie ubezpieczenia + ZAS-53: dobrowolne chorobowe i zaległość w składkach.", expected: "Blokada wypłaty do spłaty zadłużenia (art. 2a)", tone: "red" },
  { key: "karolina", title: "Karolina Nowak – bliźnięta, wcześniaki", summary: "ZAM: poród w 27. tyg., hospitalizacja, wniosek o 81,5%.", expected: "Macierzyński 31 tyg. + uzupełniający 8 tyg.", tone: "gold" },
  { key: "ewa", title: "Ewa Lis – zlecenie, adopcja", summary: "Z-3a: dobrowolne chorobowe, płatnik 27 osób.", expected: "Ubezpieczona – zasiłek wypłaca płatnik", tone: "green" },
  { key: "julia", title: "Julia Zielińska – studentka na zleceniu", summary: "ZAM z brakami: bez podpisu i numeru rachunku.", expected: "NIE podlega – świadczenie rodzicielskie", tone: "red" },
  { key: "ola", title: "Aleksandra Mazur – koniec umowy przed porodem", summary: "Zrzut z systemu: zlecenie rozwiązane 30.11.2026, poród 02.2027.", expected: "NIE – ubezpieczenie ustało przed porodem", tone: "red" },
  { key: "robert", title: "Robert Kaczmarek – błędne dane", summary: "Z-3 z błędnym PESEL i NIP, bez liczby ubezpieczonych.", expected: "Braki formalne do uzupełnienia", tone: "orange" },
] as const satisfies readonly { key: string; title: string; summary: string; expected: string; tone: SampleCase["tone"] }[];

export const SAMPLE_CASES: SampleCase[] = [
  { id: "zam-anna", caseKey: "anna", file: "ZAM_Kowalczyk_Anna.pdf", form: "ZAM", person: "Anna Kowalczyk", summary: "Pracownica małej firmy (12 os.), przewidywana data porodu 15.01.2027", expected: "Ubezpieczona – zasiłek wypłaca ZUS", tone: "green" },
  { id: "z3-anna", caseKey: "anna", file: "Z-3_Kowalczyk_Anna.pdf", form: "Z-3", person: "Anna Kowalczyk", summary: "Zaświadczenie płatnika z 12 mies. wynagrodzeń, w tym miesiąc < 1/2 etatu", expected: "Podstawa z uzupełnieniem i wyłączeniem miesięcy", tone: "blue" },
  { id: "pos-magda", caseKey: "magda", file: "Poswiadczenie_Wisniewska_Magdalena.pdf", form: "Poświadczenie", person: "Magdalena Wiśniewska", summary: "JDG od 05.2026, dobrowolne chorobowe, zaległość 312,45 zł", expected: "Blokada wypłaty – art. 2a (zadłużenie > 1%)", tone: "red" },
  { id: "zas53-magda", caseKey: "magda", file: "ZAS-53_Wisniewska_Magdalena.pdf", form: "ZAS-53", person: "Magdalena Wiśniewska", summary: "Wniosek o zasiłek chorobowy w ciąży (kod B), staż 3 mies.", expected: "Zasiłek 100% – podstawa z art. 48a", tone: "gold" },
  { id: "zam-nowak", caseKey: "karolina", file: "ZAM_Nowak_Karolina.pdf", form: "ZAM", person: "Karolina Nowak", summary: "Bliźnięta z 27. tyg., 940 g, hospitalizacja 52 dni, wniosek o 81,5%", expected: "Macierzyński 31 tyg. + uzupełniający 8 tyg.", tone: "gold" },
  { id: "z3a-ewa", caseKey: "ewa", file: "Z-3a_Lis_Ewa.pdf", form: "Z-3a", person: "Ewa Lis", summary: "Zleceniobiorczyni z dobrowolnym chorobowym, płatnik 27 os., adopcja", expected: "Ubezpieczona – zasiłek wypłaca płatnik", tone: "green" },
  { id: "zam-julia", caseKey: "julia", file: "ZAM_Zielinska_Julia_braki.pdf", form: "ZAM", person: "Julia Zielińska", summary: "Studentka < 26 lat na zleceniu, brak podpisu i rachunku", expected: "NIE podlega – świadczenie rodzicielskie", tone: "red" },
  { id: "zrzut-zlecenie", caseKey: "ola", file: "Zrzut_systemu_Mazur_Ola.pdf", form: "Zrzut systemu", person: "Aleksandra Mazur", summary: "Umowa zlecenia rozwiązana 30.11.2026, poród 02.2027", expected: "NIE – ubezpieczenie ustało przed porodem", tone: "red" },
  { id: "z3-bledy", caseKey: "robert", file: "Z-3_bledne_dane.pdf", form: "Z-3", person: "Robert Kaczmarek", summary: "Zaświadczenie z błędnym PESEL i NIP, bez liczby ubezpieczonych", expected: "Braki formalne do uzupełnienia", tone: "orange" },
];
