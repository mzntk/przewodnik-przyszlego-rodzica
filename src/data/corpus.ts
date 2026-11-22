/**
 * Jeden indeks całej treści aplikacji – dla lupki i dla ZUSi.
 * Nowa treść w aplikacji (poradnik, lista, ryzyko…) trafia tu automatycznie z plików danych.
 */
import { GLOSSARY } from "./glossary";
import { KNOWLEDGE } from "./knowledge";
import { GUIDES } from "./documents";
import { ARTICLES, CHECKLISTS, PLACES, PLACE_LABELS } from "./organize";
import { RISKS } from "./risks";
import { CHARITIES, HOTLINES } from "./support";
import { prepare } from "@/lib/search";

export type CorpusKind = "sekcja" | "pytanie" | "pojęcie" | "druk" | "poradnik" | "lista" | "ryzyko" | "telefon" | "organizacja" | "funkcja" | "miejsce";

export interface CorpusEntry {
  id: string;
  kind: CorpusKind;
  title: string;
  /** Krótki opis w wynikach lupki. */
  text: string;
  /** Pełna odpowiedź ZUSi (gdy inna niż `text`). */
  answer?: string;
  keywords?: string[];
  href?: string;
  /** Podpis linku w odpowiedzi ZUSi. */
  linkLabel?: string;
  caseId?: string;
  legal?: string;
}

const CHECKLIST_KEYWORDS: Record<string, string[]> = {
  torbaMama: ["torba", "szpital", "poród", "spakować", "pakowanie", "rzeczy", "co zabrać", "mama"],
  torbaDziecko: ["torba", "szpital", "poród", "spakować", "noworodek", "dziecko", "ubranka"],
  torbaPartner: ["torba", "szpital", "poród", "spakować", "tata", "partner"],
  wyprawka: ["wyprawka", "kupić", "zakupy", "łóżeczko", "wózek", "fotelik", "przygotowanie"],
};

/** Funkcje aplikacji – „jak to zrobić w aplikacji?”. */
const FEATURES: Omit<CorpusEntry, "kind">[] = [
  { id: "f-przeglad", title: "Jakie urlopy i zasiłki mi przysługują?", text: "Przegląd: urlop macierzyński (20–37 tyg., 100%), rodzicielski (41/43 tyg., 70% lub 81,5%), ojcowski (2 tyg., 100%), uzupełniający przy wcześniakach, na warunkach macierzyńskiego przy adopcji. Twoje kwoty i terminy – w „Ile i kiedy dostanę”.", answer: "Przy ubezpieczeniu chorobowym w dniu porodu przysługuje zasiłek macierzyński za okres urlopów:\n• macierzyński – 20 tygodni przy jednym dziecku (do 37 przy pięcioraczkach), 100%,\n• rodzicielski – 41 tygodni (43 przy więcej niż jednym dziecku), 70% albo 81,5% przy wniosku w 21 dni po porodzie; po 9 tygodni zarezerwowane dla każdego rodzica,\n• ojcowski – 2 tygodnie dla taty, 100%, do 12. miesiąca życia dziecka,\n• uzupełniający – przy wcześniakach i hospitalizacji noworodka,\n• na warunkach urlopu macierzyńskiego – przy adopcji i rodzinie zastępczej.\nBez ubezpieczenia – świadczenie rodzicielskie 1000 zł. Twoje kwoty i terminy zobaczysz w „Ile i kiedy dostanę”.", keywords: ["urlopy", "zasiłki", "przysługuje", "świadczenia", "uprawnienia", "należy", "jakie", "przegląd", "wszystkie"], href: "/swiadczenia", legal: "art. 29a ustawy zasiłkowej" },
  { id: "f-polozna", title: "Położna i wizyty patronażowe", text: "Od 21. tygodnia ciąży wybierasz położną POZ (deklaracja w przychodni). Po porodzie przychodzi do domu na 4–6 wizyt patronażowych. Wizytę zaplanujesz w kalendarzu ciąży.", keywords: ["położna", "patronaż", "patronażowe", "wizyty", "deklaracja", "poz", "przychodnia"], href: "/ciaza" },
  { id: "f-wydarzenie", title: "Jak dodać wizytę lub wydarzenie do kalendarza?", text: "Moja ciąża → Kalendarz → przycisk „Dodaj wydarzenie”. Wybierz rodzaj (wizyta, USG, położna…), datę, godzinę i miejsce. Możesz pokazać je partnerowi.", keywords: ["wizyta", "kalendarz", "dodać", "termin", "usg", "badanie", "lekarz", "wydarzenie"], href: "/ciaza" },
  { id: "f-partner", title: "Jak dodać partnera / tatę do konta?", text: "Ustawienia → Partner → „Utwórz link zaproszenia”. Partner otwiera link, loguje się swoim mObywatelem i sam uzupełnia swoje dane. Ty decydujesz, co widzi.", keywords: ["partner", "tata", "mąż", "zaprosić", "dodać", "link", "zaproszenie", "dostęp", "zalogować", "logowanie", "mObywatel", "konto partnera"], href: "/ustawienia#partner" },
  { id: "f-tata-wsparcie", title: "Jak pomóc partnerce po porodzie?", text: "Przejmij formalności (USC, NFZ, 800+), zadbaj o odpoczynek i jedzenie mamy, ogranicz wizyty gości i obserwuj jej nastrój.", answer: "Najlepsze wsparcie to przejęcie logistyki, żeby mama mogła odpoczywać i karmić:\n• przejmij formalności: rejestracja dziecka w USC (21 dni), zgłoszenie do ubezpieczenia zdrowotnego, wniosek o 800+, Twój urlop ojcowski,\n• zadbaj o jedzenie i wodę w zasięgu ręki przy karmieniu, ogranicz wizyty gości,\n• przewijaj, kąp i kangurku dziecko – możesz robić wszystko poza karmieniem piersią,\n• obserwuj nastrój partnerki: smutek dłuższy niż 2 tygodnie, lęk czy wycofanie to sygnał, by poszukać pomocy (Centrum Wsparcia 800 70 2222).\nWięcej w poradniku „Tato, jak realnie wesprzeć partnerkę w połogu”.", keywords: ["pomóc", "wesprzeć", "wsparcie", "partnerka", "żona", "mama", "tata", "po porodzie", "połóg"], href: "/ciaza?tab=poradniki&art=tata-polog", linkLabel: "Czytaj poradnik dla taty" },
  { id: "f-powiadomienia", title: "Jak ustawić powiadomienia (e-mail, push)?", text: "Ustawienia → Powiadomienia. Dla każdego tematu (terminy, statusy spraw, odpowiedzi z ZUS, wizyty) wybierasz kanał: w aplikacji, e-mail albo push.", keywords: ["powiadomienia", "przypomnienia", "email", "mail", "push", "alert"], href: "/ustawienia#powiadomienia" },
  { id: "f-wiadomosci", title: "Jak zadać pytanie ZUS i gdzie są odpowiedzi?", text: "Ustawienia → Wiadomości z ZUS. Wybierz temat i napisz pytanie. Odpowiedź pojawi się w tej skrzynce, pod dzwonkiem i (jeśli włączone) na e-mail.", keywords: ["wiadomość", "pytanie", "napisać", "kontakt", "odpowiedź", "pue", "ezus"], href: "/ustawienia#wiadomosci" },
  { id: "f-dane", title: "Jak usunąć swoje dane (RODO)?", text: "Ustawienia → Konto → „Usuń dane z urządzenia”. Tam też wyłączysz wsparcie AI.", keywords: ["rodo", "dane", "usunąć", "prywatność", "ai"], href: "/ustawienia#konto" },
  { id: "f-dokument", title: "Jak sprawdzić dokument PDF przed wysłaniem do ZUS?", text: "Sprawdź dokument → wgraj PDF albo wybierz sprawę testową. Aplikacja wskaże braki formalne, ustali ubezpieczenie, płatnika i wysokość zasiłku.", keywords: ["pdf", "dokument", "sprawdzić", "błędy", "braki", "skan", "wgrać"], href: "/dokumenty" },
  { id: "f-kalkulator", title: "Jak policzyć mój zasiłek?", text: "Policz zasiłek – kalkulator pokaże kwoty i okresy dla obojga rodziców, wariant 100%+70% albo 81,5%, łączenie z pracą, adopcję i rodzinę zastępczą.", keywords: ["policzyć", "kalkulator", "ile", "kwota", "zasiłek", "wyliczyć"], href: "/kalkulator" },
  { id: "f-warianty", title: "Co się bardziej opłaca: 81,5% czy 100% + 70%?", text: "Kalkulator → zakładka z wariantami porównuje obie opcje dla Twojej podstawy. Wniosek o 81,5% trzeba złożyć najpóźniej 21 dni po porodzie.", keywords: ["81,5", "wariant", "opłaca", "porównać", "100", "70"], href: "/kalkulator?tab=warianty" },
  { id: "f-podzial", title: "Jak zaplanować podział urlopu z partnerem?", text: "Kalkulator → „Podział urlopu”: ustaw tygodnie mamy i taty, urlop ojcowski i 9 tygodni dla każdego rodzica.", keywords: ["podział", "urlop", "tata", "partner", "plan", "tygodnie"], href: "/kalkulator?tab=podzial" },
  { id: "f-placowki", title: "Gdzie jest najbliższy ZUS, USC lub przychodnia?", text: "Gdzie to załatwić – mapa oddziałów ZUS, urzędów stanu cywilnego, przychodni POZ i szpitali, z wyszukiwarką i trasą.", keywords: ["mapa", "gdzie", "oddział", "najbliższy", "adres", "urząd", "przychodnia"], href: "/placowki" },
  { id: "f-epds", title: "Ankieta samopoczucia po porodzie (EPDS)", text: "Pomoc i telefony → „Jak się czujesz?” – 10 pytań Edynburskiej Skali Depresji Poporodowej. Wynik widzisz tylko Ty.", answer: "Przykro mi, że tak się czujesz – nie jesteś w tym sama. Smutek i płaczliwość w pierwszych dniach po porodzie (baby blues) są częste i zwykle mijają w ciągu 2 tygodni. Jeśli trwają dłużej albo narastają, porozmawiaj z położną lub lekarzem.\n\nW „Pomoc i telefony” jest krótka ankieta samopoczucia (EPDS) – wynik widzisz tylko Ty.\n\nJeśli jest Ci bardzo ciężko, zadzwoń teraz: Centrum Wsparcia 800 70 2222 (całodobowo, bezpłatnie). W zagrożeniu życia – 112.", linkLabel: "Pomoc i telefony", keywords: ["samopoczucie", "depresja", "smutek", "ankieta", "nastrój", "baby blues", "psycholog"], href: "/wsparcie" },
  { id: "f-raport", title: "Jak przygotować raport dla lekarza?", text: "Moja ciąża → Kalendarz → zaznaczaj samopoczucie i objawy, a potem „Raport dla lekarza (PDF)”.", keywords: ["raport", "lekarz", "objawy", "dziennik", "pdf", "samopoczucie"], href: "/ciaza" },
  { id: "f-sprawy", title: "Jak sprawdzić status mojego wniosku?", text: "Moje sprawy – statusy pobieramy z ZUS automatycznie: niezłożony, zarejestrowany, weryfikacja, wymaga uzupełnienia, przyznany.", keywords: ["status", "wniosek", "sprawa", "decyzja", "rozpatrzenie"], href: "/wnioski" },
  { id: "f-tydzien", title: "Który to tydzień ciąży i co się teraz dzieje?", text: "Moja ciąża → Kalendarz pokazuje tydzień ciąży, zmiany w ciele, rozwój dziecka i badania na ten czas.", keywords: ["tydzień", "ciąża", "rozwój", "badania", "trymestr"], href: "/ciaza" },
];

/** Zakładki aplikacji – ZUSia przekierowuje do nich tak jak lupka (linki dopasowuje do roli konta). */
const SECTIONS: Omit<CorpusEntry, "kind">[] = [
  { id: "s-panel", title: "Start – co jest teraz do zrobienia", text: "Pulpit: najbliższe terminy, sprawy w ZUS i stan ciąży.", keywords: ["start", "pulpit", "główna", "teraz", "zrobienia", "sekcja"], href: "/panel", linkLabel: "Otwórz Start" },
  { id: "s-ciaza", title: "Moja ciąża – kalendarz", text: "Kalendarz ciąży: tydzień, wizyty, badania, samopoczucie.", keywords: ["kalendarz", "ciąża", "tydzień", "wizyty", "sekcja"], href: "/ciaza", linkLabel: "Otwórz kalendarz" },
  { id: "s-listy", title: "Torba do szpitala i wyprawka", text: "Listy do odhaczania: torba dla mamy, dziecka i partnera, wyprawka.", keywords: ["torba", "wyprawka", "listy", "checklista", "sekcja"], href: "/ciaza?tab=listy", linkLabel: "Otwórz listy" },
  { id: "s-poradniki", title: "Poradniki – połóg, karmienie, formalności", text: "Poradniki o połogu, laktacji, formalnościach, powrocie do pracy i dla taty.", keywords: ["poradniki", "artykuły", "połóg", "wiedza", "czytać", "sekcja"], href: "/ciaza?tab=poradniki", linkLabel: "Otwórz poradniki" },
  { id: "s-wnioski", title: "Moje sprawy – wnioski i statusy", text: "Wnioski i dokumenty z Twojej sytuacji, statusy z ZUS, wypełnione druki do pobrania.", keywords: ["sprawy", "wnioski", "druki", "dokumenty", "status", "sekcja"], href: "/wnioski", linkLabel: "Otwórz Moje sprawy" },
  { id: "s-swiadczenia", title: "Ile i kiedy dostanę – moje świadczenia", text: "Kwoty, oś czasu zasiłków, terminy i Centrum alertów.", keywords: ["świadczenia", "pieniądze", "kwoty", "oś", "terminy", "alerty", "sekcja"], href: "/swiadczenia", linkLabel: "Otwórz świadczenia" },
  { id: "s-kalkulator", title: "Policz zasiłek – kalkulator", text: "Kalkulator zasiłków dla obojga rodziców.", keywords: ["kalkulator", "policz", "wylicz", "sekcja"], href: "/kalkulator", linkLabel: "Otwórz kalkulator" },
  { id: "s-dokumenty", title: "Sprawdź dokument PDF", text: "Analiza dokumentu przed wysłaniem do ZUS.", keywords: ["sprawdź", "dokument", "pdf", "sekcja"], href: "/dokumenty", linkLabel: "Sprawdź dokument" },
  { id: "s-wsparcie", title: "Pomoc i telefony", text: "Panel SOS, telefony wsparcia, trudne sytuacje, organizacje pomocowe, ankieta samopoczucia.", keywords: ["pomoc", "telefony", "sos", "wsparcie", "sekcja"], href: "/wsparcie", linkLabel: "Otwórz Pomoc i telefony" },
  { id: "s-placowki", title: "Gdzie to załatwić – mapa", text: "Mapa oddziałów ZUS, USC, przychodni i szpitali.", keywords: ["mapa", "placówki", "gdzie", "sekcja"], href: "/placowki", linkLabel: "Otwórz mapę" },
  { id: "s-partner", title: "Moje sprawy i urlop taty", text: "Panel partnera: formalności po porodzie i urlop ojcowski.", keywords: ["tata", "partner", "urlop", "ojcowski", "sprawy", "sekcja"], href: "/partner", linkLabel: "Otwórz panel taty" },
  { id: "s-ustawienia", title: "Ustawienia i konto", text: "Profil, dane z ZUS, wiadomości, partner, powiadomienia, konto i RODO.", keywords: ["ustawienia", "konto", "profil", "sekcja"], href: "/ustawienia", linkLabel: "Otwórz ustawienia" },
];

export const CORPUS: CorpusEntry[] = [
  ...SECTIONS.map((x): CorpusEntry => ({ ...x, kind: "sekcja" })),
  ...KNOWLEDGE.map((k): CorpusEntry => ({ id: `k-${k.id}`, kind: "pytanie", title: k.q, text: k.a, keywords: k.keywords, href: k.links?.[0]?.href, linkLabel: k.links?.[0]?.label, legal: k.legal })),
  ...Object.entries(GLOSSARY).map(([id, g]): CorpusEntry => ({ id: `g-${id}`, kind: "pojęcie", title: g.term, text: g.what, answer: `${g.term}: ${g.what}\nDla kogo: ${g.who}` })),
  ...Object.values(GUIDES).map((g): CorpusEntry => ({ id: `d-${g.id}`, kind: "druk", title: `${g.code} – ${g.name}`, text: g.howTo[0] ?? "", answer: `${g.code} – ${g.name}.\n${g.howTo.slice(0, 3).map((x) => `• ${x}`).join("\n")}`, keywords: [g.code, g.to, ...g.prepare], caseId: g.id, legal: g.legal })),
  ...ARTICLES.map((a): CorpusEntry => ({ id: `a-${a.id}`, kind: "poradnik", title: a.title, text: a.lead, answer: `${a.lead}\n\n${a.body.slice(0, 2).join("\n\n")}`, keywords: [a.category, ...a.body], href: `/ciaza?tab=poradniki&art=${a.id}` })),
  ...Object.entries(CHECKLISTS).map(([id, l]): CorpusEntry => ({ id: `l-${id}`, kind: "lista", title: l.title, text: l.items.slice(0, 4).join(", ") + "…", answer: `${l.title}:\n${l.items.map((x) => `• ${x}`).join("\n")}`, keywords: [...(CHECKLIST_KEYWORDS[id] ?? []), ...l.items], href: "/ciaza?tab=listy" })),
  ...RISKS.map((r): CorpusEntry => ({ id: `r-${r.id}`, kind: "ryzyko", title: r.title, text: r.what, answer: `${r.what}\n\nJak tego uniknąć: ${r.avoid}`, keywords: ["ryzyko", "utrata", "stracić"], href: "/swiadczenia#centrum-alertow", legal: r.legal })),
  ...HOTLINES.map((h): CorpusEntry => ({ id: `t-${h.number}`, kind: "telefon", title: `${h.name}: ${h.number}`, text: h.note, keywords: ["telefon", "numer", "infolinia", "pomoc"], href: `tel:${h.number.replace(/\s/g, "")}` })),
  ...CHARITIES.map((c): CorpusEntry => ({ id: `o-${c.name}`, kind: "organizacja", title: c.name, text: c.description, answer: `${c.name}: ${c.description}${c.phone ? ` Telefon: ${c.phone}.` : ""}`, keywords: ["fundacja", "pomoc", "wsparcie", ...c.categories], href: "/wsparcie" })),
  ...FEATURES.map((f): CorpusEntry => ({ ...f, kind: "funkcja" })),
  {
    id: "f-ryzyka",
    kind: "funkcja",
    title: "Kiedy mogę stracić zasiłek albo dostać mniej?",
    text: "Przegląd sytuacji, w których można stracić prawo do świadczenia albo zmienia się jego długość lub kwota.",
    answer: `Najczęstsze sytuacje, w których można stracić zasiłek albo dostać mniej:\n${RISKS.map((r) => `• ${r.title}`).join("\n")}\n\nKażdy punkt – z wyjaśnieniem i sposobem, jak tego uniknąć – znajdziesz w „Ile i kiedy dostanę” → Centrum alertów → „Na co uważać”.`,
    keywords: ["stracić", "utrata", "mniej", "obniżenie", "ryzyko", "zagrożenia", "odebrać", "zabrać", "przepadnie"],
    href: "/swiadczenia#centrum-alertow",
    linkLabel: "Na co uważać",
  },
  ...PLACES.map((p): CorpusEntry => ({ id: `p-${p.id}`, kind: "miejsce", title: p.name, text: `${p.address}, ${p.city}`, keywords: [PLACE_LABELS[p.type], p.city, p.note ?? ""], href: "/placowki" })),
];

export const CORPUS_INDEX = prepare(CORPUS);
