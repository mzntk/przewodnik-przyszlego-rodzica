/** Mapa placówek (dane demonstracyjne – Warszawa), checklisty, artykuły i książki. */

export type PlaceType = "zus" | "usc" | "poz" | "szpital";
export interface Place {
  id: string;
  type: PlaceType;
  city: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  note?: string;
  hours?: string;
  phone?: string;
}

export const PLACE_LABELS: Record<PlaceType, string> = { zus: "Oddziały ZUS", usc: "Urzędy Stanu Cywilnego", poz: "Przychodnie POZ", szpital: "Szpitale położnicze" };
export const PLACE_HINT: Record<PlaceType, string> = { zus: "Wnioski o zasiłki, Z-3, zaświadczenia, pomoc w PUE/eZUS", usc: "Akt urodzenia, PESEL, uznanie ojcostwa", poz: "Położna środowiskowa, szczepienia, pediatra", szpital: "Poród, szkoła rodzenia, KTG" };
const ZUS_H = "pn 8:00–18:00, wt–pt 8:00–15:00";
const USC_H = "pn–pt 8:00–16:00";

/** Dane demonstracyjne – adresy rzeczywiste, współrzędne przybliżone. W produkcji: rejestry ZUS, USC i NFZ. */
export const PLACES: Place[] = [
  // Warszawa
  { id: "zus1", type: "zus", city: "Warszawa", name: "ZUS I Oddział w Warszawie", address: "ul. Czerniakowska 16", lat: 52.2219, lng: 21.0466, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "zus2", type: "zus", city: "Warszawa", name: "ZUS II Oddział w Warszawie", address: "ul. Senatorska 6", lat: 52.2427, lng: 21.0108, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "zus3", type: "zus", city: "Warszawa", name: "ZUS III Oddział w Warszawie", address: "ul. Podskarbińska 25", lat: 52.2427, lng: 21.0777, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "zusc", type: "zus", city: "Warszawa", name: "ZUS – Centrala", address: "ul. Szamocka 3, 5", lat: 52.2627, lng: 20.9714, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "usc1", type: "usc", city: "Warszawa", name: "Urząd Stanu Cywilnego m.st. Warszawy", address: "ul. Andersa 5", lat: 52.2459, lng: 20.9993, hours: USC_H },
  { id: "usc2", type: "usc", city: "Warszawa", name: "USC – Delegatura Praga-Południe", address: "ul. Grochowska 274", lat: 52.2492, lng: 21.0634, hours: USC_H },
  { id: "usc3", type: "usc", city: "Warszawa", name: "USC – Delegatura Mokotów", address: "ul. Rakowiecka 25/27", lat: 52.2034, lng: 21.0085, hours: USC_H },
  { id: "sz1", type: "szpital", city: "Warszawa", name: "Szpital Specjalistyczny im. św. Zofii", address: "ul. Żelazna 90", lat: 52.2368, lng: 20.9886, note: "III stopień referencyjności" },
  { id: "sz2", type: "szpital", city: "Warszawa", name: "Szpital Kliniczny im. ks. Anny Mazowieckiej", address: "ul. Karowa 2", lat: 52.2398, lng: 21.0237, note: "III stopień – ciąże wysokiego ryzyka" },
  { id: "sz3", type: "szpital", city: "Warszawa", name: "Szpital Bielański", address: "ul. Cegłowska 80", lat: 52.2846, lng: 20.9549 },
  { id: "sz4", type: "szpital", city: "Warszawa", name: "Szpital Specjalistyczny Inflancka", address: "ul. Inflancka 6", lat: 52.2585, lng: 20.9937, note: "Szkoła rodzenia" },
  { id: "sz5", type: "szpital", city: "Warszawa", name: "Szpital Specjalistyczny Świętej Rodziny", address: "ul. Madalińskiego 25", lat: 52.2058, lng: 21.0108 },
  { id: "poz1", type: "poz", city: "Warszawa", name: "Przychodnia POZ – Mokotów", address: "ul. Puławska 145", lat: 52.1934, lng: 21.0221, note: "Położna środowiskowa" },
  { id: "poz2", type: "poz", city: "Warszawa", name: "Przychodnia POZ – Wola", address: "ul. Wolska 37", lat: 52.2318, lng: 20.9625, note: "Położna środowiskowa" },
  { id: "poz3", type: "poz", city: "Warszawa", name: "Przychodnia POZ – Praga", address: "ul. Targowa 15", lat: 52.2526, lng: 21.0388, note: "Położna środowiskowa" },
  { id: "poz4", type: "poz", city: "Warszawa", name: "Przychodnia POZ – Ursynów", address: "ul. Wasilkowskiego 7", lat: 52.1500, lng: 21.0476, note: "Położna, pediatra" },
  { id: "poz5", type: "poz", city: "Warszawa", name: "Przychodnia POZ – Bielany", address: "ul. Szegedyńska 11", lat: 52.2768, lng: 20.9480, note: "Położna środowiskowa" },
  // Kraków
  { id: "kr-zus", type: "zus", city: "Kraków", name: "ZUS Oddział w Krakowie", address: "ul. Pędzichów 27", lat: 50.0717, lng: 19.9409, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "kr-usc", type: "usc", city: "Kraków", name: "Urząd Stanu Cywilnego w Krakowie", address: "ul. Lubelska 27", lat: 50.0745, lng: 19.9335, hours: USC_H },
  { id: "kr-sz", type: "szpital", city: "Kraków", name: "Szpital Uniwersytecki w Krakowie", address: "ul. Jakubowskiego 2", lat: 50.0105, lng: 20.0006, note: "III stopień referencyjności" },
  { id: "kr-sz2", type: "szpital", city: "Kraków", name: "Szpital im. S. Żeromskiego", address: "os. Na Skarpie 66", lat: 50.0738, lng: 20.0353 },
  { id: "kr-poz", type: "poz", city: "Kraków", name: "Przychodnia POZ – Krowodrza", address: "ul. Kazimierza Wielkiego 41", lat: 50.0757, lng: 19.9210, note: "Położna środowiskowa" },
  // Gdańsk
  { id: "gd-zus", type: "zus", city: "Gdańsk", name: "ZUS Oddział w Gdańsku", address: "ul. Chmielna 27/33", lat: 54.3463, lng: 18.6584, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "gd-usc", type: "usc", city: "Gdańsk", name: "Urząd Stanu Cywilnego w Gdańsku", address: "ul. Nowe Ogrody 8/12", lat: 54.3491, lng: 18.6406, hours: USC_H },
  { id: "gd-sz", type: "szpital", city: "Gdańsk", name: "Uniwersyteckie Centrum Kliniczne – Położnictwo", address: "ul. Smoluchowskiego 17", lat: 54.3733, lng: 18.6274, note: "III stopień referencyjności" },
  { id: "gd-poz", type: "poz", city: "Gdańsk", name: "Przychodnia POZ – Wrzeszcz", address: "ul. Grunwaldzka 107", lat: 54.3817, lng: 18.6060, note: "Położna środowiskowa" },
  // Wrocław
  { id: "wr-zus", type: "zus", city: "Wrocław", name: "ZUS Oddział we Wrocławiu", address: "ul. Pretficza 11", lat: 51.0925, lng: 17.0094, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "wr-usc", type: "usc", city: "Wrocław", name: "Urząd Stanu Cywilnego we Wrocławiu", address: "ul. Włodkowica 20", lat: 51.1086, lng: 17.0258, hours: USC_H },
  { id: "wr-sz", type: "szpital", city: "Wrocław", name: "Uniwersytecki Szpital Kliniczny", address: "ul. Borowska 213", lat: 51.0858, lng: 17.0352, note: "III stopień referencyjności" },
  { id: "wr-poz", type: "poz", city: "Wrocław", name: "Przychodnia POZ – Krzyki", address: "ul. Powstańców Śląskich 95", lat: 51.0899, lng: 17.0187, note: "Położna środowiskowa" },
  // Poznań
  { id: "po-zus", type: "zus", city: "Poznań", name: "ZUS Oddział w Poznaniu", address: "ul. Dąbrowskiego 12", lat: 52.4093, lng: 16.9131, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "po-usc", type: "usc", city: "Poznań", name: "Urząd Stanu Cywilnego w Poznaniu", address: "ul. Libelta 16/20", lat: 52.4119, lng: 16.9204, hours: USC_H },
  { id: "po-sz", type: "szpital", city: "Poznań", name: "Ginekologiczno-Położniczy Szpital Kliniczny", address: "ul. Polna 33", lat: 52.4207, lng: 16.8899, note: "III stopień referencyjności" },
  { id: "po-poz", type: "poz", city: "Poznań", name: "Przychodnia POZ – Jeżyce", address: "ul. Dąbrowskiego 77", lat: 52.4148, lng: 16.8960, note: "Położna środowiskowa" },
  // Łódź
  { id: "lo-zus", type: "zus", city: "Łódź", name: "ZUS I Oddział w Łodzi", address: "ul. Zamenhofa 2", lat: 51.7621, lng: 19.4583, hours: ZUS_H, phone: "22 560 16 00" },
  { id: "lo-usc", type: "usc", city: "Łódź", name: "Urząd Stanu Cywilnego w Łodzi", address: "ul. Piotrkowska 153", lat: 51.7593, lng: 19.4589, hours: USC_H },
  { id: "lo-sz", type: "szpital", city: "Łódź", name: "Instytut Centrum Zdrowia Matki Polki", address: "ul. Rzgowska 281/289", lat: 51.7066, lng: 19.4802, note: "III stopień referencyjności" },
  { id: "lo-poz", type: "poz", city: "Łódź", name: "Przychodnia POZ – Śródmieście", address: "ul. Kopernika 38", lat: 51.7600, lng: 19.4440, note: "Położna środowiskowa" },
];

export const CITIES = [...new Set(PLACES.map((p) => p.city))];
export const CITY_CENTER: Record<string, [number, number]> = { Warszawa: [52.235, 21.01], Kraków: [50.0614, 19.9366], Gdańsk: [54.352, 18.6466], Wrocław: [51.1079, 17.0385], Poznań: [52.4064, 16.9252], Łódź: [51.7592, 19.456] };

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
