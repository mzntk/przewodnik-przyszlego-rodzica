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
}

export const SAMPLE_CASES: SampleCase[] = [
  { id: "zam-anna", file: "ZAM_Kowalczyk_Anna.pdf", form: "ZAM", person: "Anna Kowalczyk", summary: "Pracownica małej firmy (12 os.), przewidywana data porodu 15.01.2027", expected: "Ubezpieczona – zasiłek wypłaca ZUS", tone: "green" },
  { id: "z3-anna", file: "Z-3_Kowalczyk_Anna.pdf", form: "Z-3", person: "Anna Kowalczyk", summary: "Zaświadczenie płatnika z 12 mies. wynagrodzeń, w tym miesiąc < 1/2 etatu", expected: "Podstawa z uzupełnieniem i wyłączeniem miesięcy", tone: "blue" },
  { id: "pos-magda", file: "Poswiadczenie_Wisniewska_Magdalena.pdf", form: "Poświadczenie", person: "Magdalena Wiśniewska", summary: "JDG od 05.2026, dobrowolne chorobowe, zaległość 312,45 zł", expected: "Blokada wypłaty – art. 2a (zadłużenie > 1%)", tone: "red" },
  { id: "zas53-magda", file: "ZAS-53_Wisniewska_Magdalena.pdf", form: "ZAS-53", person: "Magdalena Wiśniewska", summary: "Wniosek o zasiłek chorobowy w ciąży (kod B), staż 3 mies.", expected: "Zasiłek 100% – podstawa z art. 48a", tone: "gold" },
  { id: "zam-nowak", file: "ZAM_Nowak_Karolina.pdf", form: "ZAM", person: "Karolina Nowak", summary: "Bliźnięta z 27. tyg., 940 g, hospitalizacja 52 dni, wniosek o 81,5%", expected: "Macierzyński 31 tyg. + uzupełniający 8 tyg.", tone: "gold" },
  { id: "z3a-ewa", file: "Z-3a_Lis_Ewa.pdf", form: "Z-3a", person: "Ewa Lis", summary: "Zleceniobiorczyni z dobrowolnym chorobowym, płatnik 27 os., adopcja", expected: "Ubezpieczona – zasiłek wypłaca płatnik", tone: "green" },
  { id: "zam-julia", file: "ZAM_Zielinska_Julia_braki.pdf", form: "ZAM", person: "Julia Zielińska", summary: "Studentka < 26 lat na zleceniu, brak podpisu i rachunku", expected: "NIE podlega – świadczenie rodzicielskie", tone: "red" },
  { id: "zrzut-zlecenie", file: "Zrzut_systemu_Mazur_Ola.pdf", form: "Zrzut systemu", person: "Aleksandra Mazur", summary: "Umowa zlecenia rozwiązana 30.11.2026, poród 02.2027", expected: "NIE – ubezpieczenie ustało przed porodem", tone: "red" },
  { id: "z3-bledy", file: "Z-3_bledne_dane.pdf", form: "Z-3", person: "Robert Kaczmarek", summary: "Zaświadczenie z błędnym PESEL i NIP, bez liczby ubezpieczonych", expected: "Braki formalne do uzupełnienia", tone: "orange" },
];
