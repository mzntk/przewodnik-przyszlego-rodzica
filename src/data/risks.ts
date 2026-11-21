/**
 * Zagrożenia i ryzyka: kiedy można STRACIĆ prawo do świadczenia albo kiedy zmienia się jego WYMIAR lub WYSOKOŚĆ.
 * Język prosty; podstawy prawne do weryfikacji przez prawnika ZUS przed wdrożeniem.
 */
export type RiskEffect = "utrata" | "wysokosc" | "wymiar";
export type RiskWho = "wszyscy" | "etat" | "zlecenie_jdg" | "jdg" | "tata";

export interface Risk {
  id: string;
  effect: RiskEffect;
  who: RiskWho;
  title: string;
  what: string;
  avoid: string;
  legal: string;
}

export const EFFECT_LABEL: Record<RiskEffect, string> = { utrata: "Możesz stracić świadczenie", wysokosc: "Zmienia się kwota", wymiar: "Zmienia się długość" };
export const EFFECT_TONE: Record<RiskEffect, "red" | "orange" | "gold"> = { utrata: "red", wysokosc: "orange", wymiar: "gold" };

export const RISKS: Risk[] = [
  { id: "l4-praca", effect: "utrata", who: "wszyscy", title: "Praca lub wyjazd w czasie zwolnienia lekarskiego", what: "Jeśli na L4 pracujesz zarobkowo albo wykorzystujesz zwolnienie niezgodnie z jego celem (np. remont, wyjazd wbrew zaleceniom), tracisz zasiłek chorobowy za CAŁE zwolnienie. ZUS i pracodawca mogą to skontrolować.", avoid: "Na zwolnieniu odpoczywaj i stosuj się do zaleceń. Jeśli lekarz zaznaczył „może chodzić”, możesz wychodzić np. do sklepu czy apteki.", legal: "art. 17 ust. 1 ustawy zasiłkowej" },
  { id: "skladka-dobrowolna", effect: "utrata", who: "zlecenie_jdg", title: "Spóźniona składka na dobrowolne chorobowe", what: "Na zleceniu lub w firmie ubezpieczenie chorobowe jest dobrowolne. Jeśli składka wpłynie choćby dzień po terminie, ubezpieczenie ustaje od 1. dnia tego miesiąca – a bez ubezpieczenia w dniu porodu nie ma zasiłku macierzyńskiego.", avoid: "Płać składki przed terminem (zlecenie – pilnuje zleceniodawca). Po spóźnieniu od razu złóż wniosek do ZUS o zgodę na opłacenie składki po terminie.", legal: "art. 14 ust. 2 pkt 2 u.s.u.s." },
  { id: "zaleglosc", effect: "utrata", who: "jdg", title: "Zaległość w składkach przedsiębiorcy", what: "Dług w składkach wyższy niż 1% płacy minimalnej (48,06 zł w 2026 r.) w dniu powstania prawa do zasiłku wstrzymuje wypłatę. Jeśli nie spłacisz go w 6 miesięcy – prawo do zasiłku przepada.", avoid: "Sprawdź stan rozliczeń w PUE/eZUS przed porodem i spłać całość zaległości.", legal: "art. 2a ustawy zasiłkowej" },
  { id: "koniec-umowy", effect: "utrata", who: "zlecenie_jdg", title: "Umowa kończy się przed porodem", what: "Zasiłek macierzyński przysługuje tylko, gdy w dniu porodu masz ubezpieczenie chorobowe. Gdy zlecenie skończy się wcześniej albo zawiesisz firmę – zostaje świadczenie rodzicielskie 1000 zł (kosiniakowe). Umowa o pracę na czas określony przedłuża się do porodu, jeśli kończyłaby się po 3. miesiącu ciąży.", avoid: "Przed końcem umowy porozmawiaj o jej przedłużeniu i sprawdź datę w kalkulatorze.", legal: "art. 29 ust. 1 ustawy zasiłkowej" },
  { id: "przedawnienie", effect: "utrata", who: "wszyscy", title: "Za późno złożony wniosek o wypłatę", what: "Prawo do zasiłku przedawnia się, jeśli nie złożysz wniosku w ciągu 6 miesięcy od dnia, w którym prawo ustało.", avoid: "Składaj dokumenty od razu – w aplikacji widzisz terminy i przypomnienia.", legal: "art. 67 ustawy zasiłkowej" },
  { id: "9-tygodni", effect: "wymiar", who: "tata", title: "Tata nie weźmie swoich 9 tygodni", what: "9 tygodni urlopu rodzicielskiego jest zarezerwowane dla każdego z rodziców. Jeśli tata z nich nie skorzysta, przepadają – mama nie może ich przejąć.", avoid: "Zaplanuj urlop taty w kalkulatorze (zakładka „Podział urlopu”).", legal: "art. 182¹a § 4 KP" },
  { id: "ojcowski", effect: "wymiar", who: "tata", title: "Urlop ojcowski po 12. miesiącu życia dziecka", what: "2 tygodnie urlopu ojcowskiego trzeba wykorzystać do ukończenia przez dziecko 12 miesięcy. Potem przepadają.", avoid: "Złóż wniosek u pracodawcy co najmniej 7 dni przed planowanym urlopem.", legal: "art. 182³ KP" },
  { id: "wariant", effect: "wysokosc", who: "wszyscy", title: "Wniosek o 81,5% po 21 dniach od porodu", what: "Równa stawka 81,5% za cały urlop wymaga wniosku najpóźniej 21 dni po porodzie. Po terminie dostaniesz 100% za macierzyński i 70% za rodzicielski – suma bywa niższa.", avoid: "Porównaj warianty w kalkulatorze i zdecyduj przed porodem.", legal: "art. 31 ustawy zasiłkowej" },
  { id: "laczenie", effect: "wysokosc", who: "etat", title: "Praca w czasie urlopu rodzicielskiego", what: "Możesz łączyć rodzicielski z pracą do 1/2 etatu – wtedy urlop wydłuża się, a zasiłek maleje proporcjonalnie do czasu pracy.", avoid: "Złóż wniosek o łączenie co najmniej 21 dni przed powrotem i sprawdź nową kwotę w kalkulatorze.", legal: "art. 182¹e KP" },
  { id: "48a", effect: "wysokosc", who: "jdg", title: "Podwyższenie podstawy składek tuż przed porodem", what: "Przy krótkim ubezpieczeniu (poniżej 12 miesięcy) zasiłek liczy się według specjalnego wzoru – wyższa deklaracja tuż przed porodem tylko częściowo podnosi zasiłek.", avoid: "Sprawdź wyliczenie wg art. 48a w kalkulatorze, zanim zmienisz deklarację.", legal: "art. 48a ustawy zasiłkowej" },
  { id: "etat-zmiana", effect: "wysokosc", who: "etat", title: "Niższa pensja lub mniejszy etat w ostatnich 12 miesiącach", what: "Zasiłek to średnia z 12 miesięcy przed porodem (po odliczeniu 13,71% składek). Obniżka pensji czy etatu w tym czasie obniża zasiłek.", avoid: "Zmiany warunków pracy w ciąży skonsultuj z kadrami – i sprawdź skutki w kalkulatorze.", legal: "art. 36 ustawy zasiłkowej" },
];
