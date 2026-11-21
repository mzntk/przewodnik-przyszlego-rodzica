/**
 * Cytaty przepisów pokazywane po najechaniu na oznaczenie artykułu (LegalChip / LegalText).
 * KP i ustawa zasiłkowa – brzmienie zweryfikowane z wyciągami przepisów ZUS (wytyczne/materialy, Dz.U. z 2026 r.).
 * Pozostałe akty – do weryfikacji w ISAP przed wdrożeniem.
 * Aby dodać przepis: dopisz wpis z `match` (fragment oznaczenia, małe litery) i `act`.
 */
export type ActId = "kp" | "zasilkowa" | "usus" | "usr" | "emerytalna" | "asc" | "800plus" | "rodo" | "rozp" | "inne";

export const ACTS: Record<ActId, { name: string; isap: string }> = {
  kp: { name: "Kodeks pracy", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19740240141" },
  zasilkowa: { name: "Ustawa o świadczeniach pieniężnych z ubezpieczenia społecznego w razie choroby i macierzyństwa", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19990600636" },
  usus: { name: "Ustawa o systemie ubezpieczeń społecznych", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19981370887" },
  usr: { name: "Ustawa o świadczeniach rodzinnych", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20032282255" },
  emerytalna: { name: "Ustawa o emeryturach i rentach z FUS", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19981621118" },
  asc: { name: "Prawo o aktach stanu cywilnego", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20140001741" },
  "800plus": { name: "Ustawa o pomocy państwa w wychowywaniu dzieci", isap: "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20160000195" },
  rodo: { name: "RODO – rozporządzenie (UE) 2016/679", isap: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" },
  rozp: { name: "Rozporządzenie MRPiPS (wnioski i dokumenty)", isap: "https://isap.sejm.gov.pl/" },
  inne: { name: "Internetowy System Aktów Prawnych", isap: "https://isap.sejm.gov.pl/" },
};

interface Quote {
  /** Fragmenty, które muszą wystąpić w oznaczeniu (np. „177 § 3” + „kp”). */
  match: string[];
  act: ActId;
  ref: string;
  text: string;
}

export const LEGAL_QUOTES: Quote[] = [
  // Kodeks pracy (Dz.U. z 2026 r. poz. 1245) – brzmienie wg wyciągu w wytyczne/materialy
  { match: ["177 § 3"], act: "kp", ref: "art. 177 § 3 Kodeksu pracy", text: "Umowa o pracę zawarta na czas określony albo na okres próbny przekraczający jeden miesiąc, która uległaby rozwiązaniu po upływie trzeciego miesiąca ciąży, ulega przedłużeniu do dnia porodu." },
  { match: ["177"], act: "kp", ref: "art. 177 § 1 Kodeksu pracy", text: "W okresie ciąży oraz w okresie urlopu macierzyńskiego, a także od dnia złożenia przez pracownicę lub pracownika wniosku o udzielenie urlopu macierzyńskiego albo jego części, urlopu na warunkach urlopu macierzyńskiego albo jego części, uzupełniającego urlopu macierzyńskiego, urlopu ojcowskiego albo jego części, urlopu rodzicielskiego albo jego części – do dnia zakończenia tego urlopu pracodawca nie może: 1) prowadzić przygotowań do wypowiedzenia lub rozwiązania bez wypowiedzenia stosunku pracy z tą pracownicą lub tym pracownikiem; 2) wypowiedzieć ani rozwiązać stosunku pracy z tą pracownicą lub tym pracownikiem, chyba że zachodzą przyczyny uzasadniające rozwiązanie umowy bez wypowiedzenia z ich winy i reprezentująca tę pracownicę lub tego pracownika zakładowa organizacja związkowa wyraziła zgodę na rozwiązanie umowy." },
  { match: ["182³"], act: "kp", ref: "art. 182³ § 1 Kodeksu pracy", text: "W celu sprawowania opieki nad dzieckiem pracownik – ojciec ma prawo do urlopu ojcowskiego w wymiarze do 2 tygodni, nie dłużej jednak niż do: 1) ukończenia przez dziecko 12 miesiąca życia albo 2) upływu 12 miesięcy od dnia uprawomocnienia się postanowienia orzekającego przysposobienie dziecka i nie dłużej niż do ukończenia przez dziecko 14 roku życia." },
  { match: ["182¹a § 4"], act: "kp", ref: "art. 182¹a § 4 Kodeksu pracy", text: "Każdemu z pracowników – rodziców dziecka przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego z wymiaru urlopu określonego w § 1 i 2. Prawa tego nie można przenieść na drugiego z pracowników – rodziców dziecka." },
  { match: ["182¹a"], act: "kp", ref: "art. 182¹a § 1–2 Kodeksu pracy", text: "§ 1. Pracownicy – rodzice dziecka mają prawo do urlopu rodzicielskiego w celu sprawowania opieki nad dzieckiem w wymiarze do: 1) 41 tygodni – w przypadku, o którym mowa w art. 180 § 1 pkt 1; 2) 43 tygodni – w przypadkach, o których mowa w art. 180 § 1 pkt 2–5. § 2. Pracownicy – rodzice dziecka posiadającego zaświadczenie, o którym mowa w art. 4 ust. 3 ustawy (…) „Za życiem”, mają prawo do urlopu rodzicielskiego (…) w wymiarze do: 1) 65 tygodni (…); 2) 67 tygodni (…)." },
  { match: ["182¹e"], act: "kp", ref: "art. 182¹e § 1 Kodeksu pracy", text: "Pracownik może łączyć korzystanie z urlopu rodzicielskiego z wykonywaniem pracy u pracodawcy udzielającego tego urlopu w wymiarze nie wyższym niż połowa pełnego wymiaru czasu pracy. W takim przypadku urlopu rodzicielskiego udziela się na pozostałą część wymiaru czasu pracy." },
  { match: ["180 § 2"], act: "kp", ref: "art. 180 § 2 Kodeksu pracy", text: "Przed przewidywaną datą porodu pracownica może wykorzystać nie więcej niż 6 tygodni urlopu macierzyńskiego." },
  { match: ["180"], act: "kp", ref: "art. 180 § 1 Kodeksu pracy", text: "Pracownicy przysługuje urlop macierzyński w wymiarze: 1) 20 tygodni – w przypadku urodzenia jednego dziecka przy jednym porodzie; 2) 31 tygodni – w przypadku urodzenia dwojga dzieci przy jednym porodzie; 3) 33 tygodni – w przypadku urodzenia trojga dzieci przy jednym porodzie; 4) 35 tygodni – w przypadku urodzenia czworga dzieci przy jednym porodzie; 5) 37 tygodni – w przypadku urodzenia pięciorga i więcej dzieci przy jednym porodzie." },
  // Ustawa zasiłkowa (Dz.U. z 2026 r. poz. 854) – brzmienie wg wyciągu w wytyczne/materialy
  { match: ["art. 2a"], act: "zasilkowa", ref: "art. 2a ust. 1–2 ustawy zasiłkowej", text: "1. Świadczenia, o których mowa w art. 2 pkt 1, 2, 5 i 6, nie przysługują osobom prowadzącym pozarolniczą działalność i osobom z nimi współpracującym (…) w razie wystąpienia w dniu powstania prawa do świadczenia zadłużenia z tytułu składek na ubezpieczenia społeczne na kwotę przekraczającą 1% minimalnego wynagrodzenia za pracę (…), do czasu spłaty całości zadłużenia. 2. Prawo do świadczeń, o których mowa w art. 2 pkt 1, 2, 5 i 6, przedawnia się, jeżeli zadłużenie, o którym mowa w ust. 1, nie zostanie uregulowane w ciągu 6 miesięcy od dnia powstania prawa do świadczenia." },
  { match: ["art. 4"], act: "zasilkowa", ref: "art. 4 ust. 1 ustawy zasiłkowej", text: "Ubezpieczony nabywa prawo do zasiłku chorobowego: 1) po upływie 30 dni nieprzerwanego ubezpieczenia chorobowego – jeżeli podlega obowiązkowo temu ubezpieczeniu; 2) po upływie 90 dni nieprzerwanego ubezpieczenia chorobowego – jeżeli jest ubezpieczony dobrowolnie." },
  { match: ["art. 6"], act: "zasilkowa", ref: "art. 6 ust. 1 ustawy zasiłkowej", text: "Zasiłek chorobowy przysługuje ubezpieczonemu, który stał się niezdolny do pracy z powodu choroby w czasie trwania ubezpieczenia chorobowego." },
  { match: ["art. 17"], act: "zasilkowa", ref: "art. 17 ust. 1 ustawy zasiłkowej", text: "Ubezpieczony traci prawo do zasiłku chorobowego za cały okres zwolnienia od pracy, w przypadku gdy w okresie orzeczonej niezdolności do pracy: 1) wykonuje pracę zarobkową lub 2) podejmuje aktywność niezgodną z celem tego zwolnienia." },
  { match: ["art. 18"], act: "zasilkowa", ref: "art. 18 ust. 1 ustawy zasiłkowej", text: "Świadczenie rehabilitacyjne przysługuje ubezpieczonemu, który po wyczerpaniu zasiłku chorobowego jest nadal niezdolny do pracy, a dalsze leczenie lub rehabilitacja lecznicza rokują odzyskanie zdolności do pracy (…)." },
  { match: ["art. 29a"], act: "zasilkowa", ref: "art. 29a ust. 1 ustawy zasiłkowej", text: "Zasiłek macierzyński przysługuje przez okres ustalony przepisami Kodeksu pracy jako okres urlopu macierzyńskiego, urlopu na warunkach urlopu macierzyńskiego, uzupełniającego urlopu macierzyńskiego, urlopu rodzicielskiego oraz urlopu ojcowskiego." },
  { match: ["art. 29"], act: "zasilkowa", ref: "art. 29 ust. 1 ustawy zasiłkowej", text: "Zasiłek macierzyński przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego: 1) urodziła dziecko; 2) przyjęła na wychowanie dziecko w wieku do 14 roku życia i wystąpiła do sądu opiekuńczego w sprawie jego przysposobienia; 3) przyjęła na wychowanie w ramach rodziny zastępczej, z wyjątkiem rodziny zastępczej zawodowej, dziecko w wieku do 7 roku życia, a w przypadku dziecka, wobec którego podjęto decyzję o odroczeniu obowiązku szkolnego – do 10 roku życia." },
  { match: ["art. 30a"], act: "zasilkowa", ref: "art. 30a ust. 1 ustawy zasiłkowej", text: "Ubezpieczona – matka dziecka, nie później niż 21 dni po porodzie, może złożyć pisemny wniosek o wypłacenie jej zasiłku macierzyńskiego za okres odpowiadający okresowi urlopu macierzyńskiego i urlopu rodzicielskiego w pełnym wymiarze, z wyłączeniem okresu, o którym mowa w art. 182¹a § 4 Kodeksu pracy, przysługującego ojcu dziecka." },
  { match: ["art. 30"], act: "zasilkowa", ref: "art. 30 ust. 1 i 3 ustawy zasiłkowej", text: "1. Zasiłek macierzyński przysługuje również w razie urodzenia dziecka po ustaniu ubezpieczenia chorobowego, jeżeli ubezpieczenie to ustało w okresie ciąży: 1) wskutek śmierci, ogłoszenia upadłości lub likwidacji pracodawcy; 2) z naruszeniem przepisów prawa, stwierdzonym prawomocnym orzeczeniem sądu. (…) 3. Ubezpieczonej będącej pracownicą, której umowa o pracę wygasła z powodu śmierci pracodawcy lub z którą rozwiązano stosunek pracy w okresie ciąży z powodu ogłoszenia upadłości lub likwidacji pracodawcy i której nie zapewniono innego zatrudnienia, przysługuje do dnia porodu zasiłek w wysokości zasiłku macierzyńskiego." },
  { match: ["art. 31"], act: "zasilkowa", ref: "art. 31 ust. 1–3 ustawy zasiłkowej", text: "1. Miesięczny zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu macierzyńskiego, okres urlopu na warunkach urlopu macierzyńskiego, uzupełniającego urlopu macierzyńskiego oraz okres urlopu ojcowskiego wynosi 100% podstawy wymiaru zasiłku. 2. Miesięczny zasiłek macierzyński za okres ustalony przepisami Kodeksu pracy jako okres urlopu rodzicielskiego wynosi 70% podstawy wymiaru zasiłku. 3. W przypadku wniosku, o którym mowa w art. 30a, miesięczny zasiłek macierzyński za cały okres odpowiadający okresowi urlopu macierzyńskiego, urlopu na warunkach urlopu macierzyńskiego oraz urlopu rodzicielskiego wynosi 81,5% podstawy wymiaru zasiłku (…)." },
  { match: ["art. 61"], act: "zasilkowa", ref: "art. 61 ust. 1 ustawy zasiłkowej", text: "Prawo do zasiłków określonych w ustawie i ich wysokość ustalają oraz zasiłki te wypłacają: 1) płatnicy składek na ubezpieczenie chorobowe, którzy zgłaszają do ubezpieczenia chorobowego powyżej 20 ubezpieczonych (…); 2) Zakład Ubezpieczeń Społecznych: a) ubezpieczonym, których płatnicy składek zgłaszają do ubezpieczenia chorobowego nie więcej niż 20 ubezpieczonych, b) ubezpieczonym prowadzącym pozarolniczą działalność i osobom z nimi współpracującym (…)." },
  { match: ["art. 64"], act: "zasilkowa", ref: "art. 64 ust. 1 ustawy zasiłkowej", text: "Płatnicy składek, o których mowa w art. 61 ust. 1 pkt 1, wypłacają zasiłki w terminach przyjętych dla wypłaty wynagrodzeń lub dochodów, a Zakład Ubezpieczeń Społecznych na bieżąco po stwierdzeniu uprawnień. Zasiłki te wypłaca się nie później jednak niż w ciągu 30 dni od dnia wyjaśnienia ostatniej okoliczności niezbędnej (…)." },
  { match: ["art. 67"], act: "zasilkowa", ref: "art. 67 ust. 1 i 3 ustawy zasiłkowej", text: "1. Roszczenie o wypłatę zasiłku chorobowego, wyrównawczego, macierzyńskiego oraz opiekuńczego przedawnia się po upływie 6 miesięcy od ostatniego dnia okresu, za który zasiłek przysługuje. (…) 3. Jeżeli niezgłoszenie roszczenia o wypłatę zasiłku nastąpiło z przyczyn niezależnych od osoby uprawnionej, termin 6 miesięcy liczy się od dnia, w którym ustała przeszkoda uniemożliwiająca zgłoszenie roszczenia." },
  // Ustawa o systemie ubezpieczeń społecznych – brak w materiałach, do weryfikacji w ISAP
  { match: ["art. 11"], act: "usus", ref: "art. 11 ust. 2 ustawy o systemie ubezpieczeń społecznych", text: "Dobrowolnie, na swój wniosek, ubezpieczeniu chorobowemu mogą przystąpić osoby objęte obowiązkowo ubezpieczeniami emerytalnym i rentowymi, wymienione w art. 6 ust. 1 pkt 2, 4, 5 i 8." },
];

const actOf = (s: string): ActId | null =>
  /\bkp\b|kodeks/.test(s) ? "kp"
  : /zasiłk/.test(s) ? "zasilkowa"
  : /u\.s\.u\.s|systemie ubezp/.test(s) ? "usus"
  : /u\.ś\.r|świadczeniach rodzinnych/.test(s) ? "usr"
  : /emerytal|emeryturach/.test(s) ? "emerytalna"
  : /stanu cywilnego/.test(s) ? "asc"
  : /800\+|wychowywaniu dzieci/.test(s) ? "800plus"
  : /rodo/.test(s) ? "rodo"
  : /rozp|zał\./.test(s) ? "rozp"
  : /przedsiębiorców|\bkc\b|cywilnego|za życiem|opieki zdrowotnej|wspieraniu rodziców|ustawy o /.test(s) ? "inne"
  : null;

/** Pojedynczy przepis (zgodność wsteczna). */
export function findQuote(label: string): { quote?: Quote; act: ActId | null } {
  const [hit] = findQuotes(label);
  return { quote: hit?.quote, act: hit && hit.act !== "inne" ? hit.act : null };
}

export interface QuoteHit {
  label: string;
  quote?: Quote;
  act: ActId;
}

/**
 * Cytaty do oznaczenia przepisu (także kilku naraz, np. „art. 177 § 3 KP; art. 30 ust. 4 ustawy zasiłkowej”).
 * `contextAct` – ustawa domyślna, gdy oznaczenie jej nie podaje (np. „art. 2a” w kalkulatorze = ustawa zasiłkowa).
 */
export function findQuotes(label: string, contextAct?: ActId): QuoteHit[] {
  return label
    .split(/;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const s = part.toLowerCase().replace(/\s+/g, " ");
      const act = actOf(s) ?? contextAct ?? "inne";
      // dopisz nazwę ustawy z kontekstu, gdy oznaczenie jej nie zawiera (np. „art. 2a” w kalkulatorze)
      const t = actOf(s) ? s : `${s} ${act === "kp" ? "kp" : act === "zasilkowa" ? "ustawy zasiłkowej" : act === "usus" ? "u.s.u.s." : ""}`;
      // „art. 6” nie może pasować do „art. 61”, a „art. 4” do „art. 48a” – po cyfrze wymagamy końca numeru
      const has = (m: string) => new RegExp(m.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + (/[0-9¹²³]$/.test(m) ? "(?![0-9a-z¹²³⁴])" : "")).test(t);
      const unit = (x: string, re: RegExp) => x.toLowerCase().match(re)?.[1];
      // gdy etykieta wskazuje inny ustęp/paragraf niż cytat w bazie – nie pokazujemy cudzego brzmienia
      const sameUnit = (q: Quote) => [/ust\. ?(\d+[a-z]*)/, /§ ?(\d+)/].every((re) => !unit(s, re) || !unit(q.ref, re) || unit(s, re) === unit(q.ref, re));
      const quote = LEGAL_QUOTES.find((q) => q.act === act && q.match.every(has) && sameUnit(q));
      return { label: part, quote, act };
    });
}

/** Wzorzec odwołań do przepisów w zwykłym tekście (np. „(art. 177 § 3 KP)”, „§ 13 ust. 2”). */
export const LEGAL_REF = /(?:\b[Aa]rt\.|§)\s?\d+[a-z]?[¹²³⁴]?[a-z]?(?:\s?[–-]\s?\d+[a-z¹²³⁴]*)?(?:\s?§\s?\d+(?:\s?[–-]\s?\d+)?)?(?:\s?ust\.\s?\d+[a-z]*)?(?:\s?pkt\s?\d+)?(?:\s(?:KP|Kodeksu pracy|ustawy zasiłkowej|ustawy emerytalnej|u\.s\.u\.s\.|u\.ś\.r\.|RODO|rozporządzenia(?: MRPiPS)?(?: z \d{1,2}\.\d{2}\.\d{4})?|rozp\. z \d{1,2}\.\d{2}\.\d{4}))?/g;
