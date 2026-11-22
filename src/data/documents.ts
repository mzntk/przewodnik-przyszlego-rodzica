/**
 * Instrukcje do wniosków i dokumentów: jak wypełnić, co przygotować, jakie załączniki.
 * Stan prawny po 24.10.2026: ZUR i ZAO połączono z ZAM, Z-3b zlikwidowano.
 * Podstawy: ustawa zasiłkowa, Kodeks pracy, rozp. MRPiPS z 27.09.2026 (Zał. 1–7, § 13) i z 11.03.2025 (wnioski urlopowe).
 */
import type { GlossaryId } from "./glossary";

export type DocId =
  | "URLOP-MAC-PRZED"
  | "URLOP-RODZ"
  | "URLOP-RODZ-TATA"
  | "URLOP-LACZENIE"
  | "URLOP-UZUP"
  | "URLOP-OJC"
  | "ZAM"
  | "ZAM-TATA"
  | "Z-3"
  | "Z-3a"
  | "ZAS-53"
  | "Z-15A"
  | "Z-12"
  | "USC-REJESTRACJA"
  | "NFZ-ZGLOSZENIE"
  | "800PLUS"
  | "ZUS-ZUA";

export type Recipient = "ZUS" | "pracodawca" | "USC";

export interface GuideContext {
  payerIsZus: boolean;
  employee: boolean;
  zaZyciem: boolean;
  supplementary: boolean;
  adoption: boolean;
  combinedVariant: boolean;
  fatherInsured: boolean;
}

export interface DocGuide {
  id: DocId;
  code: string;
  glossary?: GlossaryId;
  name: string;
  to: Recipient;
  owner: "mama" | "tata" | "płatnik";
  legal: string;
  howTo: string[];
  mistakes: string[];
  prepare: string[];
  attachments: (c: GuideContext) => string[];
}

const birthCopy = (c: GuideContext) => (c.payerIsZus ? [] : ["Odpis skrócony aktu urodzenia dziecka (lub jego kopia) – tylko gdy zasiłek wypłaca pracodawca"]);
const adoptionDocs = (c: GuideContext) => (c.adoption ? ["Zaświadczenie sądu opiekuńczego o wszczęciu postępowania o przysposobienie albo postanowienie o umieszczeniu w rodzinie zastępczej"] : []);

export const GUIDES: Record<DocId, DocGuide> = {
  "URLOP-MAC-PRZED": {
    id: "URLOP-MAC-PRZED",
    code: "Wniosek",
    glossary: "urlop-macierzynski",
    name: "Wniosek o urlop macierzyński przed porodem",
    to: "pracodawca",
    owner: "mama",
    legal: "art. 180 § 2 KP; § 2 rozp. z 11.03.2025",
    howTo: ["Wpisz imię i nazwisko oraz dzień, od którego chcesz zacząć urlop.", "Start możesz wybrać najwcześniej 6 tygodni przed przewidywaną datą porodu.", "Złóż wniosek w kadrach (papierowo lub e-mailem) najpóźniej ok. 14 dni przed startem.", "Tygodnie wykorzystane przed porodem odejmują się od całego urlopu macierzyńskiego."],
    mistakes: ["Data startu wcześniej niż 6 tygodni przed terminem porodu.", "Brak zaświadczenia lekarskiego o przewidywanej dacie porodu."],
    prepare: ["Przewidywana data porodu z karty ciąży", "Wybrana data rozpoczęcia urlopu"],
    attachments: () => ["Kopia zaświadczenia lekarskiego (na zwykłym druku) określającego przewidywaną datę porodu"],
  },
  "URLOP-RODZ": {
    id: "URLOP-RODZ",
    code: "Wniosek",
    glossary: "rodzicielski",
    name: "Wniosek o urlop rodzicielski (lub o 81,5% za cały okres)",
    to: "pracodawca",
    owner: "mama",
    legal: "art. 182¹d KP; art. 30a ustawy zasiłkowej; § 15 rozp. z 11.03.2025",
    howTo: ["Podaj okres urlopu rodzicielskiego i liczbę części, które już wykorzystaliście (łącznie maks. 5 części).", "Jeśli chcesz 81,5% za cały okres – napisz to wprost i złóż wniosek najpóźniej 21 dni po porodzie.", "W innym przypadku złóż wniosek min. 21 dni przed końcem urlopu macierzyńskiego – zasiłek będzie ciągły."],
    mistakes: ["Spóźniony wniosek o 81,5% (po 21 dniach od porodu zostaje wariant 100% + 70%).", "Planowanie urlopu na tygodnie zarezerwowane dla drugiego rodzica (9 tygodni)."],
    prepare: ["Plan podziału urlopu z partnerem", "Daty urodzenia dziecka i końca urlopu macierzyńskiego"],
    attachments: (c) => [...birthCopy(c), "Oświadczenie o okresie urlopu rodzicielskiego wykorzystanym przez drugiego rodzica (lub o jego braku)", ...(c.zaZyciem ? ["Zaświadczenie „Za życiem” – wydłuża urlop do 65/67 tygodni"] : [])],
  },
  "URLOP-RODZ-TATA": {
    id: "URLOP-RODZ-TATA",
    code: "Wniosek",
    glossary: "9-tygodni",
    name: "Wniosek taty o urlop rodzicielski",
    to: "pracodawca",
    owner: "tata",
    legal: "art. 182¹a § 4 i art. 182¹d KP; § 15 rozp. z 11.03.2025",
    howTo: ["Wpisz okres swojego urlopu rodzicielskiego – co najmniej 9 tygodni, żeby nie stracić części zarezerwowanej dla Ciebie.", "Podaj, ile urlopu i ile części wykorzystała już mama.", "Złóż wniosek min. 21 dni przed rozpoczęciem."],
    mistakes: ["Łączny urlop obojga rodziców przekracza 41/43 tygodnie.", "Brak informacji o częściach wykorzystanych przez mamę."],
    prepare: ["Daty urlopu mamy", "Twoje daty urlopu"],
    attachments: () => ["Odpis skrócony aktu urodzenia dziecka (lub kopia)", "Oświadczenie mamy o wykorzystanym urlopie rodzicielskim"],
  },
  "URLOP-LACZENIE": {
    id: "URLOP-LACZENIE",
    code: "Wniosek",
    glossary: "rodzicielski",
    name: "Wniosek o łączenie urlopu rodzicielskiego z pracą",
    to: "pracodawca",
    owner: "mama",
    legal: "art. 182¹e–182¹f KP; art. 31 ust. 4a ustawy zasiłkowej",
    howTo: ["Wpisz wymiar pracy – maksymalnie pół etatu.", "Podaj okres, w którym chcesz łączyć urlop z pracą.", "Opisz, jak wykorzystasz tygodnie, o które urlop się wydłuży (np. bezpośrednio po okresie łączenia).", "Złóż wniosek min. 21 dni przed powrotem do pracy. Pracodawca może odmówić tylko ze względu na organizację pracy (pisemnie w 7 dni)."],
    mistakes: ["Wymiar pracy powyżej 1/2 etatu.", "Brak opisu wykorzystania wydłużonej części urlopu."],
    prepare: ["Uzgodniony z przełożonym wymiar i godziny pracy", "Okres łączenia"],
    attachments: () => [],
  },
  "URLOP-UZUP": {
    id: "URLOP-UZUP",
    code: "Wniosek",
    glossary: "uzupelniajacy",
    name: "Wniosek o uzupełniający urlop macierzyński",
    to: "pracodawca",
    owner: "mama",
    legal: "art. 180² KP; § 14 rozp. z 11.03.2025",
    howTo: ["Wpisz datę końca urlopu macierzyńskiego i okres urlopu uzupełniającego – zaczyna się zaraz po macierzyńskim.", "Urlop udziela się jednorazowo, bez dzielenia na części.", "Złóż wniosek min. 21 dni przed końcem urlopu macierzyńskiego (lub niezwłocznie, jeśli dziecko wciąż jest w szpitalu)."],
    mistakes: ["Brak zaświadczenia szpitala z tygodniem ciąży, masą urodzeniową i okresem pobytu.", "Wniosek złożony przez oboje rodziców – przysługuje tylko jednemu."],
    prepare: ["Tydzień ciąży przy porodzie i masa urodzeniowa", "Daty pobytu dziecka w szpitalu"],
    attachments: () => ["Zaświadczenie szpitala o urodzeniu i pobycie dziecka w szpitalu (art. 180² § 5 KP)", "Oświadczenie, że drugi rodzic nie korzysta z uzupełniającego urlopu"],
  },
  "URLOP-OJC": {
    id: "URLOP-OJC",
    code: "Wniosek",
    glossary: "ojcowski",
    name: "Wniosek o urlop ojcowski",
    to: "pracodawca",
    owner: "tata",
    legal: "art. 182³ KP",
    howTo: ["Wybierz 14 dni naraz albo dwie części po 7 dni.", "Złóż wniosek min. 7 dni przed startem.", "Wykorzystaj urlop do ukończenia przez dziecko 12 miesięcy – potem przepada."],
    mistakes: ["Część krótsza niż 7 dni.", "Urlop zaplanowany po 12. miesiącu życia dziecka."],
    prepare: ["Data urodzenia dziecka", "Wybrane daty urlopu"],
    attachments: (c) => (c.payerIsZus ? [] : ["Odpis skrócony aktu urodzenia dziecka – gdy zasiłek wypłaca pracodawca"]),
  },
  "ZAM-TATA": {
    id: "ZAM-TATA",
    code: "ZAM",
    glossary: "ZAM",
    name: "Wniosek o zasiłek macierzyński – tata (urlop ojcowski)",
    to: "ZUS",
    owner: "tata",
    legal: "art. 29 ust. 1 pkt 4 ustawy zasiłkowej; Zał. 6 rozp. z 27.09.2026",
    howTo: ["Tata na zleceniu albo z własną firmą nie bierze urlopu u pracodawcy – składa ZAM do ZUS (lub zleceniodawcy, gdy ten wypłaca zasiłki).", "Zaznacz „urlopu ojcowskiego” i podaj okres (14 dni naraz albo 2 × 7 dni) – do ukończenia przez dziecko 12 miesięcy.", "Odpowiedz na oświadczenie, czy pobierałeś już zasiłek za ten okres z innego tytułu.", "Podaj numer rachunku i podpisz wniosek."],
    mistakes: ["Okres po 12. miesiącu życia dziecka.", "Część krótsza niż 7 dni.", "Zaznaczenie TAK i NIE w tym samym oświadczeniu."],
    prepare: ["PESEL Twój i dziecka", "NIP i REGON zleceniodawcy albo Twojej firmy", "Numer rachunku bankowego", "Data urodzenia dziecka"],
    attachments: (c) => (c.payerIsZus ? [] : ["Odpis skrócony aktu urodzenia dziecka"]),
  },
  ZAM: {
    id: "ZAM",
    code: "ZAM",
    glossary: "ZAM",
    name: "Wniosek o zasiłek macierzyński",
    to: "ZUS",
    owner: "mama",
    legal: "art. 29–31 ustawy zasiłkowej; Zał. 6 rozp. z 27.09.2026",
    howTo: ["Złóż w PUE/eZUS albo w placówce ZUS. Od 24.10.2026 ZAM obejmuje też dawne wnioski ZUR (rodzicielski) i ZAO (ojcowski).", "Zaznacz rodzaj urlopu i okres, za który chcesz zasiłek.", "Jeśli chcesz 81,5% za cały okres – zaznacz to najpóźniej 21 dni po porodzie.", "Odpowiedz na pytanie o zaświadczenie „Za życiem” i o plan wykorzystania rodzicielskiego w 1. roku życia dziecka.", "Podaj numer rachunku i podpisz wniosek."],
    mistakes: ["Brak podpisu lub numeru rachunku.", "Puste pole o zaświadczeniu „Za życiem”.", "Użycie zlikwidowanego druku ZUR lub ZAO."],
    prepare: ["PESEL Twój i dziecka", "NIP płatnika (zleceniodawcy) lub dane Twojej firmy", "Numer rachunku bankowego", "Data porodu lub przewidywana data porodu"],
    attachments: (c) => [
      ...(c.payerIsZus ? [] : ["Odpis skrócony aktu urodzenia dziecka"]),
      ...(c.zaZyciem ? ["Zaświadczenie „Za życiem”"] : []),
      ...(c.supplementary ? ["Zaświadczenie szpitala o pobycie dziecka (urlop uzupełniający)"] : []),
      ...adoptionDocs(c),
      "Zaświadczenie lekarskie o przewidywanej dacie porodu – tylko jeśli zasiłek ma zacząć się przed porodem",
    ],
  },
  "Z-3": {
    id: "Z-3",
    code: "Z-3",
    glossary: "Z-3",
    name: "Zaświadczenie płatnika składek (pracownik)",
    to: "ZUS",
    owner: "płatnik",
    legal: "Zał. 2 rozp. z 27.09.2026",
    howTo: ["Wystawia i wysyła do ZUS Twój pracodawca – Ty nic nie wypełniasz.", "Pracodawca podaje wynagrodzenia z 12 miesięcy z liczbą dni przepracowanych i obowiązujących oraz liczbę ubezpieczonych.", "Możesz poprosić kadry o termin wysłania i sprawdzić w PUE/eZUS, czy dotarło."],
    mistakes: ["Brak dni przepracowanych przy miesiącach z nieobecnością.", "Brak liczby ubezpieczonych zgłaszanych do ubezpieczenia chorobowego."],
    prepare: ["Informacja dla kadr o dacie porodu i planowanym urlopie"],
    attachments: () => [],
  },
  "Z-3a": {
    id: "Z-3a",
    code: "Z-3a",
    glossary: "Z-3a",
    name: "Zaświadczenie płatnika składek (zlecenie)",
    to: "ZUS",
    owner: "płatnik",
    legal: "Zał. 3 rozp. z 27.09.2026",
    howTo: ["Wystawia zleceniodawca i przekazuje do ZUS.", "Zawiera przychód z poszczególnych miesięcy i okresy dobrowolnego ubezpieczenia chorobowego.", "Ty składasz ZAM – Z-3a to uzupełnienie od płatnika."],
    mistakes: ["Brak okresów podlegania ubezpieczeniu chorobowemu."],
    prepare: ["Poinformuj zleceniodawcę o złożeniu ZAM"],
    attachments: () => [],
  },
  "ZAS-53": {
    id: "ZAS-53",
    code: "ZAS-53",
    glossary: "ZAS-53",
    name: "Wniosek o zasiłek chorobowy (przedsiębiorca)",
    to: "ZUS",
    owner: "mama",
    legal: "Zał. 1 rozp. z 27.09.2026; art. 2a ustawy zasiłkowej",
    howTo: ["Złóż w PUE/eZUS po otrzymaniu e-ZLA.", "Wskaż okres zwolnienia i jego serię i numer.", "Upewnij się, że nie masz zaległości w składkach powyżej 1% płacy minimalnej – inaczej ZUS wstrzyma wypłatę."],
    mistakes: ["Zaległość w składkach w dniu powstania prawa do zasiłku.", "Brak numeru rachunku."],
    prepare: ["Seria i numer e-ZLA", "Numer rachunku bankowego", "Potwierdzenie opłacenia składek"],
    attachments: () => [],
  },
  "Z-15A": {
    id: "Z-15A",
    code: "Z-15",
    glossary: "Z-15A",
    name: "Wniosek o zasiłek opiekuńczy (Z-15)",
    to: "ZUS",
    owner: "mama",
    legal: "art. 32–35 ustawy zasiłkowej; Zał. 7 rozp. z 27.09.2026",
    howTo: ["Podaj okres opieki i serię oraz numer zwolnienia na dziecko (albo informację o zamknięciu żłobka/przedszkola).", "Oświadcz, że w domu nie ma nikogo, kto mógłby zapewnić opiekę.", "Wpisz dni zasiłku opiekuńczego wykorzystane w tym roku przez Ciebie i drugiego rodzica."],
    mistakes: ["Pominięcie dni wykorzystanych przez drugiego rodzica (limit 60 dni jest wspólny)."],
    prepare: ["PESEL dziecka", "Seria i numer zwolnienia na dziecko", "Liczba dni opieki wykorzystanych w tym roku"],
    attachments: () => ["Oświadczenie placówki o nieprzewidzianym zamknięciu – jeśli dotyczy"],
  },
  "Z-12": {
    id: "Z-12",
    code: "Z-12",
    glossary: "Z-12",
    name: "Wniosek o zasiłek pogrzebowy",
    to: "ZUS",
    owner: "mama",
    legal: "art. 77–80 ustawy o emeryturach i rentach z FUS",
    howTo: ["Złóż w ciągu 12 miesięcy od dnia śmierci – także po urodzeniu martwego dziecka.", "Wnioskuje osoba, która pokryła koszty pogrzebu.", "Podaj numer rachunku do wypłaty 7000 zł."],
    mistakes: ["Brak rachunków za pogrzeb.", "Przekroczenie terminu 12 miesięcy."],
    prepare: ["Akt zgonu (przy martwym urodzeniu – wydany na podstawie karty martwego urodzenia)", "Rachunki za pogrzeb"],
    attachments: () => ["Skrócony odpis aktu zgonu", "Rachunki potwierdzające koszty pogrzebu"],
  },
  "USC-REJESTRACJA": {
    id: "USC-REJESTRACJA",
    code: "USC",
    name: "Rejestracja urodzenia w USC",
    to: "USC",
    owner: "tata",
    legal: "ustawa – Prawo o aktach stanu cywilnego",
    howTo: ["Zgłoś urodzenie w ciągu 21 dni od wystawienia karty urodzenia – online przez gov.pl lub w USC.", "USC sporządzi akt urodzenia, nada PESEL i zamelduje dziecko.", "Jeśli nie jesteście małżeństwem – tata uznaje ojcostwo (najlepiej jeszcze w ciąży)."],
    mistakes: ["Przekroczenie 21 dni – USC może zarejestrować urodzenie z urzędu."],
    prepare: ["Dowody osobiste rodziców", "Wybrane imię (imiona) dziecka", "Akt małżeństwa lub dokument uznania ojcostwa"],
    attachments: () => [],
  },
  "NFZ-ZGLOSZENIE": {
    id: "NFZ-ZGLOSZENIE",
    code: "ZCNA",
    glossary: "ZUA",
    name: "Zgłoszenie dziecka do ubezpieczenia zdrowotnego",
    to: "ZUS",
    owner: "tata",
    legal: "ustawa o świadczeniach opieki zdrowotnej",
    howTo: ["Zgłoś dziecko w ciągu 7 dni od nadania PESEL.", "Pracownik składa krótkie oświadczenie w kadrach – pracodawca wysyła ZUS ZCNA.", "Przedsiębiorca wysyła ZUS ZCNA sam w PUE/eZUS."],
    mistakes: ["Zgłoszenie przez oboje rodziców – wystarczy jedno."],
    prepare: ["PESEL dziecka", "Adres zamieszkania dziecka"],
    attachments: () => [],
  },
  "800PLUS": {
    id: "800PLUS",
    code: "800+",
    glossary: "800plus",
    name: "Wniosek o 800+",
    to: "ZUS",
    owner: "mama",
    legal: "ustawa o pomocy państwa w wychowywaniu dzieci",
    howTo: ["Złóż przez PUE/eZUS, mObywatel lub bankowość elektroniczną.", "Wniosek złożony do 3 miesięcy od urodzenia daje wyrównanie od dnia narodzin."],
    mistakes: ["Wniosek złożony po 3 miesiącach – wypłata dopiero od miesiąca złożenia."],
    prepare: ["PESEL dziecka", "Numer rachunku"],
    attachments: () => [],
  },
  "ZUS-ZUA": {
    id: "ZUS-ZUA",
    code: "ZUA",
    glossary: "ZUA",
    name: "Ponowne zgłoszenie do dobrowolnego ubezpieczenia chorobowego",
    to: "ZUS",
    owner: "mama",
    legal: "ustawa o systemie ubezpieczeń społecznych",
    howTo: ["Po zakończeniu zasiłku macierzyńskiego złóż ZUS ZUA z kodem obejmującym dobrowolne ubezpieczenie chorobowe.", "Zrób to od pierwszego dnia po zasiłku, żeby nie stracić ochrony (np. zasiłku opiekuńczego)."],
    mistakes: ["Brak zgłoszenia – ubezpieczenie chorobowe nie wraca automatycznie."],
    prepare: ["Data końca zasiłku macierzyńskiego", "Kod tytułu ubezpieczenia"],
    attachments: () => [],
  },
};
