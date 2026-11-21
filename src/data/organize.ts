/** Mapa placówek (dane demonstracyjne – Warszawa), checklisty, artykuły i książki. */

export type PlaceType = "zus" | "usc" | "poz" | "szpital";
export interface Place {
  id: string;
  type: PlaceType;
  name: string;
  address: string;
  lat: number;
  lng: number;
  note?: string;
}

export const PLACE_LABELS: Record<PlaceType, string> = { zus: "Oddziały ZUS", usc: "Urzędy Stanu Cywilnego", poz: "Przychodnie POZ", szpital: "Szpitale położnicze" };

export const PLACES: Place[] = [
  { id: "zus1", type: "zus", name: "ZUS I Oddział w Warszawie", address: "ul. Czerniakowska 16, 00-701 Warszawa", lat: 52.2219, lng: 21.0466 },
  { id: "zus3", type: "zus", name: "ZUS III Oddział w Warszawie", address: "ul. Podskarbińska 25, 03-829 Warszawa", lat: 52.2427, lng: 21.0777 },
  { id: "zusc", type: "zus", name: "ZUS – Centrala", address: "ul. Szamocka 3, 5, 01-748 Warszawa", lat: 52.2627, lng: 20.9714 },
  { id: "usc1", type: "usc", name: "Urząd Stanu Cywilnego m.st. Warszawy", address: "ul. Andersa 5, 00-147 Warszawa", lat: 52.2459, lng: 20.9993 },
  { id: "usc2", type: "usc", name: "USC – Delegatura Praga-Południe", address: "ul. Grochowska 274, 03-841 Warszawa", lat: 52.2492, lng: 21.0634 },
  { id: "sz1", type: "szpital", name: "Szpital Specjalistyczny im. św. Zofii", address: "ul. Żelazna 90, 01-004 Warszawa", lat: 52.2368, lng: 20.9886, note: "III stopień referencyjności" },
  { id: "sz2", type: "szpital", name: "Szpital Kliniczny im. ks. Anny Mazowieckiej", address: "ul. Karowa 2, 00-315 Warszawa", lat: 52.2398, lng: 21.0237, note: "III stopień – ciąże wysokiego ryzyka" },
  { id: "sz3", type: "szpital", name: "Szpital Bielański", address: "ul. Cegłowska 80, 01-809 Warszawa", lat: 52.2846, lng: 20.9549 },
  { id: "poz1", type: "poz", name: "Przychodnia POZ – Mokotów", address: "ul. Puławska 145, 02-715 Warszawa", lat: 52.1934, lng: 21.0221, note: "Położna środowiskowa – wizyty patronażowe" },
  { id: "poz2", type: "poz", name: "Przychodnia POZ – Wola", address: "ul. Wolska 37, 01-201 Warszawa", lat: 52.2318, lng: 20.9625, note: "Położna środowiskowa – wizyty patronażowe" },
  { id: "poz3", type: "poz", name: "Przychodnia POZ – Praga", address: "ul. Targowa 15, 03-728 Warszawa", lat: 52.2526, lng: 21.0388, note: "Położna środowiskowa – wizyty patronażowe" },
];

export const CHECKLISTS = {
  torbaMama: { title: "Torba do szpitala – dla mamy", items: ["Dowód osobisty, karta ciąży, wyniki badań (grupa krwi, GBS, WR, HBs, HIV)", "Plan porodu (opcjonalnie)", "2–3 koszule nocne rozpinane z przodu", "Szlafrok i klapki pod prysznic", "Biustonosze do karmienia i wkładki laktacyjne", "Podpaski poporodowe i jednorazowe majtki siateczkowe", "Kosmetyki, ręcznik, gumki do włosów", "Woda niegazowana, przekąski", "Ładowarka do telefonu (długi kabel)", "Ubranie na wyjście (rozmiar „ciążowy”)"] },
  torbaDziecko: { title: "Torba do szpitala – dla dziecka", items: ["Pieluszki dla noworodka (rozmiar 1)", "Body i pajacyki (3–4 komplety, rozm. 56–62)", "Czapeczka i skarpetki", "Kocyk lub rożek", "Chusteczki nawilżane / waciki", "Krem na odparzenia", "Fotelik samochodowy na wyjście (0–13 kg)"] },
  torbaPartner: { title: "Torba do szpitala – dla partnera", items: ["Dowód osobisty", "Wygodne ubranie na zmianę i obuwie", "Przekąski i woda", "Ładowarka / powerbank", "Lista kontaktów do powiadomienia", "Dokumenty do USC (dowody osobiste rodziców, akt małżeństwa)"] },
  wyprawka: { title: "Wyprawka przed narodzinami", items: ["Łóżeczko z materacem", "Wózek (gondola + spacerówka)", "Fotelik samochodowy z homologacją i-Size", "Przewijak", "Wanienka i termometr do wody", "Ubranka 56–68 (wyprane w delikatnym proszku)", "Śpiworek do spania", "Termometr dla dziecka", "Aspirator do nosa", "Apteczka: sól fizjologiczna, gaziki, środek do pielęgnacji pępka zgodnie z zaleceniem położnej"] },
};

export interface Article {
  id: string;
  title: string;
  category: "połóg" | "dla ojców" | "laktacja" | "formalności" | "powrót do pracy";
  readMin: number;
  lead: string;
  body: string[];
}

export const ARTICLES: Article[] = [
  { id: "polog-bez-tabu", title: "Połóg bez tabu: co jest normalne, a co powinno zaniepokoić", category: "połóg", readMin: 5, lead: "Pierwsze 6 tygodni po porodzie to czas regeneracji ciała i ogromnych zmian emocjonalnych.", body: ["Krwawienie poporodowe (odchody) trwa zwykle 4–6 tygodni i stopniowo zmienia kolor z czerwonego na brunatny, a potem jasny. Nagłe nasilenie krwawienia, skrzepy większe niż śliwka lub nieprzyjemny zapach to sygnał do pilnego kontaktu z lekarzem.", "Gorączka powyżej 38°C, silny ból brzucha, zaczerwieniona i bolesna pierś czy ból łydki to objawy wymagające konsultacji tego samego dnia.", "Przysługują Ci bezpłatne wizyty patronażowe położnej środowiskowej (zwykle 4–6). Wybierz położną POZ jeszcze w ciąży – po porodzie szpital przekazuje informację, a położna umawia pierwszą wizytę.", "Baby blues – płaczliwość i huśtawki nastroju w pierwszych dniach – dotyczy większości kobiet i mija w ciągu 2 tygodni. Jeśli smutek trwa dłużej lub narasta, wypełnij ankietę samopoczucia w zakładce Wsparcie."] },
  { id: "tata-polog", title: "Tato, jak realnie wesprzeć partnerkę w połogu", category: "dla ojców", readMin: 4, lead: "Najlepsze wsparcie to przejęcie logistyki – tak, żeby mama mogła odpoczywać i karmić.", body: ["Przejmij formalności: rejestracja w USC (21 dni), zgłoszenie dziecka do ubezpieczenia zdrowotnego, wniosek o 800+ i urlop ojcowski. Masz to wszystko w swoim panelu.", "Zadbaj o regenerację: jedzenie, woda w zasięgu ręki przy karmieniu, ograniczenie wizyt gości.", "Obserwuj nastrój partnerki – przedłużający się smutek, lęk czy wycofanie to sygnał, by porozmawiać i poszukać pomocy.", "Weź swoje 2 tygodnie ojcowskiego i zaplanuj 9 niezbywalnych tygodni rodzicielskiego – inaczej przepadną."] },
  { id: "tata-pielegnacja", title: "Pielęgnacja noworodka: przewijanie, kąpiel, kangurowanie", category: "dla ojców", readMin: 4, lead: "Ojciec może robić przy dziecku wszystko poza karmieniem piersią.", body: ["Kąpiel: woda ok. 37°C, w pierwszych tygodniach wystarczy 2–3 razy w tygodniu. Kikut pępowiny utrzymuj w suchości zgodnie z zaleceniami położnej.", "Kangurowanie (kontakt skóra do skóry) stabilizuje oddech i temperaturę dziecka i buduje więź – także z tatą.", "Bezpieczny sen: na plecach, na twardym materacu, bez poduszek i maskotek w łóżeczku."] },
  { id: "laktacja-start", title: "Laktacja na start: pierwsze 2 tygodnie", category: "laktacja", readMin: 5, lead: "Karmienie to umiejętność, której uczy się mama i dziecko – na początku bywa trudno, to normalne.", body: ["Przystawiaj dziecko często – 8–12 razy na dobę, także w nocy. To częstotliwość buduje laktację.", "Ból przy karmieniu najczęściej oznacza nieprawidłowe przystawienie. Poproś o pomoc położną lub doradczynię laktacyjną (w wielu szpitalach dostępna bezpłatnie).", "Oznaki, że dziecko się najada: min. 6 mokrych pieluszek na dobę od 5. dnia, przyrost masy po powrocie do masy urodzeniowej (ok. 2 tyg.).", "Gorąca, zaczerwieniona pierś z gorączką może oznaczać zapalenie – skontaktuj się z lekarzem."] },
  { id: "formalnosci", title: "Formalności po porodzie krok po kroku", category: "formalności", readMin: 3, lead: "Lista spraw do załatwienia w pierwszych tygodniach – z terminami.", body: ["Do 21 dni: rejestracja urodzenia w USC (akt urodzenia, PESEL, zameldowanie). Można to zrobić online przez gov.pl.", "Do 7 dni od nadania PESEL: zgłoszenie dziecka do ubezpieczenia zdrowotnego (pracodawca lub ZUS ZCNA).", "Do 21 dni od porodu: decyzja o wariancie 81,5%.", "Do 3 miesięcy: wniosek o 800+ z wyrównaniem od urodzenia.", "Min. 21 dni przed końcem macierzyńskiego: wniosek o rodzicielski."] },
  { id: "powrot", title: "Powrót do pracy: łączenie urlopu z etatem i ochrona przed zwolnieniem", category: "powrót do pracy", readMin: 4, lead: "Nie musisz wybierać między pracą a urlopem – możesz je łączyć.", body: ["Na urlopie rodzicielskim możesz pracować do 1/2 etatu – urlop się wydłuży, a zasiłek zmniejszy proporcjonalnie.", "Od złożenia wniosku o urlop do jego końca pracodawca nie może wypowiedzieć ani rozwiązać umowy (poza wyjątkami).", "Po powrocie możesz złożyć wniosek o obniżenie wymiaru czasu pracy (do 1/2) – także jest chroniony.", "Pracownikowi wychowującemu dziecko do 8 lat przysługuje prawo do wnioskowania o elastyczną organizację pracy (np. praca zdalna)."] },
];

export const BOOKS = [
  { title: "Jak mówić, żeby dzieci nas słuchały. Jak słuchać, żeby dzieci do nas mówiły", author: "Adele Faber, Elaine Mazlish", why: "Klasyka komunikacji z dzieckiem – praktyczne, spokojne podejście." },
  { title: "Zintegrowany mózg, zintegrowane dziecko", author: "Daniel J. Siegel, Tina Payne Bryson", why: "Jak rozwija się mózg dziecka i jak reagować na trudne emocje." },
  { title: "Twoje kompetentne dziecko", author: "Jesper Juul", why: "O zaufaniu do dziecka i zdejmowaniu z rodziców presji perfekcji." },
  { title: "Najszczęśliwsze dziecko w okolicy", author: "Harvey Karp", why: "Sprawdzone sposoby na uspokajanie noworodka." },
  { title: "Położna. 3550 cudów narodzin", author: "Jeanette Kalyta", why: "Ciepłe, oswajające opowieści o porodzie i pierwszych dniach." },
];
