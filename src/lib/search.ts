/**
 * Wspólny silnik wyszukiwania (lupka + ZUSia). Bez zależności – działa w przeglądarce i na serwerze.
 * Polska odmiana: porównujemy wspólny początek słów („szpitala” ≈ „szpital”, „urlopy” ≈ „urlop”),
 * pomijamy słowa nieistotne („co”, „jak”, „do”…) i rozwijamy synonimy („spakować” → torba).
 */

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

const STOP = new Set(
  "a aby albo ale ani az bo by byc co czy dla do gdy gdzie i ich ile im ja jak jaka jaki jakie jakiej jakim jest jestem juz kiedy kto ktora ktore ktory mam mi mnie moge moj moja moje moim mozna musze na nad nie nim no o od oraz po pod przed przez przy sa sie sobie ta tak tam te tego tej ten to tu ty u w we wiec z za ze zeby mojej mojego czym kim jakis jakas prosze powiedz chce chcialabym chcialbym potrzebuje trzeba warto lub wyglada wygladac robi robic zrobic dziala dzialac potrzebne potrzeba wiedziec wiem chodzi nalezy powinnam powinienem moja moze mozesz jakos sposob wlasnie teraz bardzo".split(" "),
);

/** Synonimy i potoczne określenia → słowa, które występują w treściach aplikacji. */
const SYNONYMS: Record<string, string[]> = {
  spakowac: ["torba", "spakuj", "pakowanie"],
  spakuj: ["torba"],
  pakowac: ["torba"],
  zabrac: ["torba"],
  wziac: ["torba"],
  wyprawka: ["wyprawka", "kupic"],
  kupic: ["wyprawka"],
  kasa: ["zasilek", "kwota"],
  pieniadze: ["zasilek", "kwota", "swiadczenie"],
  hajs: ["zasilek"],
  l4: ["zwolnienie", "chorobowy"],
  zwolnienie: ["zwolnienie", "l4"],
  chorobowe: ["chorobowy"],
  macierzynskie: ["macierzynski"],
  rodzicielskie: ["rodzicielski"],
  tacierzynski: ["ojcowski"],
  tacierzynskie: ["ojcowski"],
  maz: ["tata", "ojciec", "partner"],
  zona: ["partnerka", "mama", "mamy"],
  zone: ["partnerka", "mama"],
  zony: ["partnerka", "mama"],
  partnerka: ["partnerka", "mama"],
  partnerce: ["partnerka", "mama"],
  tata: ["tato", "ojciec", "ojcow"],
  tato: ["tata", "ojciec"],
  ojciec: ["tata", "tato", "ojcowski"],
  pomoc: ["pomoc", "wesprzec", "wsparcie"],
  wspierac: ["wesprzec", "wsparcie", "pomoc"],
  wesprzec: ["wesprzec", "wsparcie"],
  zarejestrowac: ["rejestracja", "usc", "akt"],
  rejestracja: ["rejestracja", "usc"],
  zalogowac: ["logowanie", "mobywatel", "zaproszenie"],
  logowanie: ["logowanie", "mobywatel"],
  noworodek: ["noworodka", "dziecko"],
  kapiel: ["kapiel", "pielegnacja"],
  kalendarz: ["kalendarz", "ciaza"],
  wnioski: ["wnioski", "sprawy"],
  sprawy: ["sprawy", "wnioski"],
  ustawienia: ["ustawienia", "konto"],
  pokaz: ["sekcja"],
  otworz: ["sekcja"],
  przejdz: ["sekcja"],
  zakladka: ["sekcja"],
  partner: ["partner", "tata", "ojciec"],
  chlopak: ["partner", "tata"],
  porod: ["porod", "szpital"],
  rodzic: ["porod", "rodzic"],
  smutek: ["samopoczucie", "depresja", "wsparcie"],
  smutna: ["samopoczucie", "depresja"],
  depresja: ["depresja", "epds", "samopoczucie"],
  placze: ["samopoczucie", "baby", "blues"],
  karmienie: ["laktacja", "karmienie"],
  piers: ["laktacja"],
  mleko: ["laktacja"],
  polozna: ["polozna", "patronazowe"],
  wizyta: ["wizyta", "kalendarz"],
  lekarz: ["lekarz", "wizyta"],
  telefon: ["telefon", "numer"],
  fundacja: ["fundacja", "charytatywne"],
  poronienie: ["poronienie", "strata"],
  wczesniak: ["wczesniak", "wczesniactwo", "uzupelniajacy"],
  pesel: ["usc", "rejestracja"],
  akt: ["akt", "usc", "odpis"],
  wniosek: ["wniosek", "druk"],
  formularz: ["druk", "wniosek", "wzor"],
  firma: ["jdg", "dzialalnosc", "przedsiebiorca"],
  dzialalnosc: ["jdg", "dzialalnosc"],
  zlecenie: ["zlecenie", "zleceniobiorca"],
  etat: ["pracownik", "umowa"],
  szef: ["pracodawca"],
  pracodawca: ["pracodawca", "platnik"],
  dlug: ["zadluzenie", "zaleglosc"],
  zaleglosci: ["zadluzenie", "zaleglosc"],
  stracic: ["utrata", "ryzyko"],
  strace: ["utrata", "ryzyko"],
  ryzyko: ["ryzyko", "utrata"],
  wypowiedzenie: ["zwolnienie", "ochrona", "177"],
  zwolnic: ["ochrona", "177", "wypowiedzenie"],
  bliznieta: ["mnoga", "dzieci"],
  blizniaki: ["mnoga", "dzieci"],
  adopcja: ["adopcja", "przysposobienie"],
  mapa: ["placowka", "mapa"],
  oddzial: ["placowka", "oddzial"],
  urzad: ["usc", "placowka"],
};

const words = (s: string) => norm(s).split(/[^a-z0-9+]+/).filter(Boolean);

/** Słowa zapytania bez słów nieistotnych + synonimy (synonimy ważą mniej). */
export function queryTerms(q: string): { term: string; weight: number }[] {
  const out: { term: string; weight: number }[] = [];
  for (const w of words(q)) {
    if (STOP.has(w) || (w.length < 2 && !/\d/.test(w))) continue;
    out.push({ term: w, weight: 1 });
    for (const s of SYNONYMS[w] ?? Object.entries(SYNONYMS).find(([k]) => sameStem(k, w))?.[1] ?? []) if (s !== w) out.push({ term: s, weight: 0.7 });
  }
  return out;
}

/** Ta sama „rodzina” słowa: krótkie (≤3 znaki, np. „zam”, „800”, „usc”) – tylko identyczne; dłuższe – wspólny początek. */
export function sameStem(a: string, b: string) {
  if (a === b) return true;
  const min = Math.min(a.length, b.length);
  if (min <= 3) return false;
  // krótkie słowa: 4 wspólne litery („torba/torby”), dłuższe: min. 5 („dziecka/dzieci”, ale nie „dziennik”)
  const k = min <= 5 ? 4 : Math.max(5, min - 2);
  return a.slice(0, k) === b.slice(0, k);
}

export interface Doc {
  id: string;
  title: string;
  keywords?: string[];
  text?: string;
}

interface Prepared<T extends Doc> {
  doc: T;
  title: string[];
  kw: string[];
  body: string[];
}

export function prepare<T extends Doc>(docs: T[]): Prepared<T>[] {
  return docs.map((doc) => ({ doc, title: [...new Set(words(doc.title))], kw: [...new Set((doc.keywords ?? []).flatMap(words))], body: [...new Set(words(doc.text ?? ""))] }));
}

export interface Hit<T> {
  doc: T;
  score: number;
  coverage: number;
}

/**
 * Ranking: trafienie w tytule 3 pkt, w słowach kluczowych 2,5, w treści 1 (× waga synonimu).
 * `coverage` – jaka część istotnych słów zapytania została znaleziona (do progu trafności).
 */
export function search<T extends Doc>(index: Prepared<T>[], q: string, limit = 20): Hit<T>[] {
  const terms = queryTerms(q);
  const primary = terms.filter((t) => t.weight === 1);
  if (!primary.length) return [];
  const phrase = norm(q).trim();
  const hits: Hit<T>[] = [];
  for (const p of index) {
    let score = 0;
    const found = new Set<string>();
    for (const t of terms) {
      const inTitle = p.title.some((w) => sameStem(w, t.term));
      const inKw = !inTitle && p.kw.some((w) => sameStem(w, t.term));
      const inBody = !inTitle && !inKw && p.body.some((w) => sameStem(w, t.term));
      const s = inTitle ? 3 : inKw ? 2.5 : inBody ? 1 : 0;
      if (s) {
        score += s * t.weight;
        // synonim „zalicza” słowo, z którego powstał
        found.add(t.weight === 1 ? t.term : (primary.find((x) => SYNONYMS[x.term]?.includes(t.term) || Object.entries(SYNONYMS).some(([k, v]) => sameStem(k, x.term) && v.includes(t.term)))?.term ?? t.term));
      }
    }
    const coverage = primary.filter((t) => found.has(t.term)).length / primary.length;
    if (!score) continue;
    if (phrase.length > 4 && norm(p.doc.title).includes(phrase)) score += 4;
    // pełne dopasowanie pytania zawsze wyżej niż częściowe (coverage²)
    hits.push({ doc: p.doc, score: score * coverage * coverage, coverage });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
