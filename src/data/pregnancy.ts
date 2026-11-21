/** Karty edukacyjne tydzień po tygodniu i standardowe etapy opieki prenatalnej (treści ogólne – nie zastępują porady lekarza). */

export interface WeekInfo {
  from: number;
  to: number;
  stage: string;
  feel: string;
  body: string;
  baby: string;
  tip: string;
}

export const WEEKS: WeekInfo[] = [
  { from: 1, to: 4, stage: "Początek ciąży", feel: "Możesz jeszcze nic nie odczuwać albo zauważyć tkliwość piersi i lekkie zmęczenie.", body: "Rośnie poziom hCG, a progesteron utrzymuje błonę śluzową macicy, umożliwiając zagnieżdżenie zarodka.", baby: "Zarodek zagnieżdża się w macicy i zaczyna intensywnie dzielić.", tip: "Przyjmuj kwas foliowy i umów pierwszą wizytę u ginekologa." },
  { from: 5, to: 8, stage: "Pierwsze tygodnie", feel: "Typowe są nudności, senność, częstsze oddawanie moczu i wahania nastroju.", body: "hCG zbliża się do szczytu (ok. 8.–10. tydzień) – stąd nudności. Progesteron spowalnia trawienie.", baby: "Około 6. tygodnia zaczyna bić serce, kształtują się zawiązki narządów.", tip: "Pierwsza wizyta do 10. tygodnia – opieka od 10. tygodnia jest warunkiem becikowego." },
  { from: 9, to: 12, stage: "Koniec I trymestru", feel: "Nudności często słabną pod koniec trymestru, ale zmęczenie może jeszcze trwać.", body: "Objętość krwi rośnie, możesz odczuwać zawroty głowy przy szybkim wstawaniu.", baby: "Wszystkie narządy są już zawiązane, dziecko ma ok. 5–6 cm.", tip: "Między 11. a 14. tygodniem wykonuje się badania prenatalne (USG I trymestru)." },
  { from: 13, to: 16, stage: "Początek II trymestru", feel: "Wiele kobiet ma więcej energii i lepszy apetyt – to często najprzyjemniejszy okres.", body: "Łożysko przejmuje produkcję hormonów, nudności zwykle mijają.", baby: "Dziecko porusza się, choć jeszcze tego nie czujesz; tworzą się odciski palców.", tip: "Poinformuj pracodawcę o ciąży (zaświadczenie lekarskie) – od tej chwili chroni Cię art. 177 KP." },
  { from: 17, to: 20, stage: "Pierwsze ruchy", feel: "Między 16. a 22. tygodniem możesz poczuć pierwsze ruchy. Mogą pojawić się bóle pleców.", body: "Relaksyna rozluźnia więzadła i stawy, przygotowując miednicę do porodu.", baby: "Dziecko słyszy dźwięki z zewnątrz i Twój głos.", tip: "USG połówkowe wykonuje się zwykle między 18. a 22. tygodniem." },
  { from: 21, to: 24, stage: "Rosnący brzuszek", feel: "Mogą pojawić się zgaga, rozstępy i uczucie ciężkości.", body: "Macica sięga powyżej pępka, rośnie zapotrzebowanie na żelazo.", baby: "Dziecko ma ok. 30 cm, regularnie śpi i się wybudza.", tip: "Między 24. a 28. tygodniem test obciążenia glukozą (OGTT)." },
  { from: 25, to: 28, stage: "Koniec II trymestru", feel: "Skurcze łydek, obrzęki nóg wieczorem, trudniej znaleźć wygodną pozycję do snu.", body: "Serce pompuje o ok. 40–50% więcej krwi niż przed ciążą.", baby: "Dziecko otwiera oczy i reaguje na światło.", tip: "Przy grupie krwi Rh– lekarz omówi immunoprofilaktykę anty-D." },
  { from: 29, to: 32, stage: "III trymestr", feel: "Duszność, zgaga i częste wizyty w toalecie – macica uciska narządy.", body: "Mogą pojawiać się skurcze Braxtona-Hicksa – nieregularne i niebolesne.", baby: "Dziecko szybko przybiera na wadze i ćwiczy oddychanie.", tip: "Wybierz położną środowiskową (deklaracja w POZ) i rozważ szkołę rodzenia." },
  { from: 33, to: 36, stage: "Przygotowania do porodu", feel: "Gorszy sen, skurcze przepowiadające, uczucie zmęczenia.", body: "Szyjka macicy zaczyna się przygotowywać, brzuch może się obniżyć.", baby: "Dziecko zwykle układa się główką w dół.", tip: "Wymaz GBS (35.–37. tydz.), spakuj torbę. Możesz zacząć macierzyński do 6 tyg. przed terminem." },
  { from: 37, to: 40, stage: "Ciąża donoszona", feel: "Niecierpliwość, uczucie ciężkości, możliwe częstsze skurcze.", body: "Rośnie wrażliwość na oksytocynę – organizm jest gotowy do porodu.", baby: "Dziecko jest gotowe do przyjścia na świat.", tip: "Zgłoś się do szpitala przy regularnych skurczach co 5 min, odejściu wód lub krwawieniu." },
  { from: 41, to: 42, stage: "Po terminie", feel: "Naturalne zniecierpliwienie – to wciąż normalny przebieg.", body: "Lekarz zaleci częstsze kontrole (KTG, USG).", baby: "Dziecko jest w pełni dojrzałe.", tip: "Trzymaj się zaleceń lekarza dotyczących kontroli po terminie." },
];

export const POSTPARTUM: WeekInfo = {
  from: 0,
  to: 0,
  stage: "Połóg",
  feel: "Zmęczenie, odchody poporodowe i huśtawki nastroju (baby blues) są normalne w pierwszych tygodniach.",
  body: "Spada poziom estrogenów i progesteronu, rośnie prolaktyna i oksytocyna – organizm wraca do formy ok. 6 tygodni.",
  baby: "Noworodek śpi 16–18 godzin na dobę i je co 2–3 godziny.",
  tip: "Przysługują Ci bezpłatne wizyty patronażowe położnej. Jeśli smutek trwa dłużej niż 2 tygodnie – wypełnij ankietę EPDS.",
};

export function weekInfo(week: number | null): WeekInfo {
  if (week === null) return POSTPARTUM;
  return WEEKS.find((w) => week >= w.from && week <= w.to) ?? WEEKS.at(-1)!;
}

/** Tydzień ciąży (1–42) na podstawie terminu porodu; null gdy dziecko już urodzone. */
export function pregnancyWeek(dueDate: string, today: string, birthDate?: string): number | null {
  if (birthDate && birthDate <= today) return null;
  const days = Math.round((Date.parse(dueDate) - Date.parse(today)) / 86400000);
  return Math.max(1, Math.min(42, 40 - Math.floor(days / 7)));
}

export const MILESTONES = [
  { week: 11, until: 14, title: "Badania prenatalne (USG I trymestru)" },
  { week: 18, until: 22, title: "USG połówkowe" },
  { week: 24, until: 28, title: "Test obciążenia glukozą (OGTT)" },
  { week: 35, until: 37, title: "Wymaz GBS" },
  { week: 39, until: 40, title: "KTG i kontrola przed porodem" },
];

export const SYMPTOM_TAGS = ["Nudności", "Zmęczenie", "Zgaga", "Ból pleców", "Obrzęki", "Skurcze łydek", "Bezsenność", "Ruchy dziecka", "Ból głowy", "Skurcze B-H", "Dobre samopoczucie", "Apetyt"];
export const MOODS = ["Bardzo źle", "Słabo", "Średnio", "Dobrze", "Świetnie"];
