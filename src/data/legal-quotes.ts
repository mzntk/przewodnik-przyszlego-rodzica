/**
 * Cytaty przepisów pokazywane po najechaniu na oznaczenie artykułu (LegalChip).
 * Brzmienie wg tekstów jednolitych – PRZED WDROŻENIEM każdy cytat weryfikuje prawnik ZUS w ISAP.
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
  { match: ["177 § 3"], act: "kp", ref: "art. 177 § 3 Kodeksu pracy", text: "Umowa o pracę zawarta na czas określony albo na okres próbny przekraczający jeden miesiąc, która uległaby rozwiązaniu po upływie trzeciego miesiąca ciąży, ulega przedłużeniu do dnia porodu." },
  { match: ["177"], act: "kp", ref: "art. 177 § 1 Kodeksu pracy", text: "Pracodawca nie może wypowiedzieć ani rozwiązać umowy o pracę w okresie ciąży, a także w okresie urlopu macierzyńskiego pracownicy, jak również od dnia złożenia przez pracownika wniosku o udzielenie urlopu na warunkach urlopu macierzyńskiego albo jego części, urlopu ojcowskiego albo jego części, urlopu rodzicielskiego albo jego części – do dnia zakończenia tego urlopu (…)." },
  { match: ["182³"], act: "kp", ref: "art. 182³ § 1 Kodeksu pracy", text: "Pracownik – ojciec wychowujący dziecko ma prawo do urlopu ojcowskiego w wymiarze do 2 tygodni, nie dłużej jednak niż: 1) do ukończenia przez dziecko 12 miesiąca życia albo 2) do upływu 12 miesięcy od dnia uprawomocnienia się postanowienia orzekającego przysposobienie dziecka i nie dłużej niż do ukończenia przez dziecko 14 roku życia." },
  { match: ["182¹a § 4"], act: "kp", ref: "art. 182¹a § 4 Kodeksu pracy", text: "Każdemu z pracowników – rodziców dziecka przysługuje wyłączne prawo do 9 tygodni urlopu rodzicielskiego z wymiaru urlopu określonego w § 1. Prawa tego nie można przenieść na drugiego z pracowników – rodziców dziecka." },
  { match: ["182¹a"], act: "kp", ref: "art. 182¹a § 1 Kodeksu pracy", text: "Pracownik – rodzic dziecka ma prawo do urlopu rodzicielskiego w wymiarze do: 1) 41 tygodni – w przypadku urodzenia jednego dziecka przy jednym porodzie, 2) 43 tygodni – w przypadku urodzenia więcej niż jednego dziecka przy jednym porodzie (…)." },
  { match: ["180 §", "kp"], act: "kp", ref: "art. 180 § 1 Kodeksu pracy", text: "Pracownicy przysługuje urlop macierzyński w wymiarze: 1) 20 tygodni w przypadku urodzenia jednego dziecka przy jednym porodzie, 2) 31 tygodni w przypadku urodzenia dwojga dzieci przy jednym porodzie, 3) 33 tygodni w przypadku urodzenia trojga dzieci przy jednym porodzie, 4) 35 tygodni w przypadku urodzenia czworga dzieci przy jednym porodzie, 5) 37 tygodni w przypadku urodzenia pięciorga i więcej dzieci przy jednym porodzie." },
  { match: ["art. 4", "zasiłk"], act: "zasilkowa", ref: "art. 4 ust. 1 ustawy zasiłkowej", text: "Ubezpieczony podlegający obowiązkowo ubezpieczeniu chorobowemu nabywa prawo do zasiłku chorobowego po upływie 30 dni nieprzerwanego ubezpieczenia chorobowego, a ubezpieczony podlegający dobrowolnie ubezpieczeniu chorobowemu – po upływie 90 dni nieprzerwanego ubezpieczenia chorobowego." },
  { match: ["art. 6", "zasiłk"], act: "zasilkowa", ref: "art. 6 ust. 1 ustawy zasiłkowej", text: "Zasiłek chorobowy przysługuje ubezpieczonemu, który stał się niezdolny do pracy z powodu choroby w czasie trwania ubezpieczenia chorobowego." },
  { match: ["art. 17", "zasiłk"], act: "zasilkowa", ref: "art. 17 ust. 1 ustawy zasiłkowej", text: "Ubezpieczony wykonujący w okresie orzeczonej niezdolności do pracy pracę zarobkową lub wykorzystujący zwolnienie od pracy w sposób niezgodny z celem tego zwolnienia traci prawo do zasiłku chorobowego za cały okres tego zwolnienia." },
  { match: ["art. 29", "zasiłk"], act: "zasilkowa", ref: "art. 29 ust. 1 ustawy zasiłkowej", text: "Zasiłek macierzyński przysługuje ubezpieczonej, która w okresie ubezpieczenia chorobowego albo w okresie urlopu wychowawczego: 1) urodziła dziecko; (…)." },
  { match: ["art. 61"], act: "zasilkowa", ref: "art. 61 ust. 1 ustawy zasiłkowej", text: "Uprawnienia do świadczeń z ubezpieczenia chorobowego oraz wysokość tych świadczeń ustalają i świadczenia te wypłacają: 1) płatnicy składek, którzy zgłaszają do ubezpieczenia chorobowego powyżej 20 ubezpieczonych; 2) Zakład Ubezpieczeń Społecznych – ubezpieczonym, którzy są zatrudnieni u płatników składek zgłaszających do ubezpieczenia chorobowego nie więcej niż 20 ubezpieczonych (…)." },
  { match: ["art. 11", "u.s.u.s"], act: "usus", ref: "art. 11 ust. 2 ustawy o systemie ubezpieczeń społecznych", text: "Dobrowolnie, na swój wniosek, ubezpieczeniu chorobowemu mogą przystąpić osoby objęte obowiązkowo ubezpieczeniami emerytalnym i rentowymi, wymienione w art. 6 ust. 1 pkt 2, 4, 5 i 8." },
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
