/**
 * Plan „przed porodem” dla spraw załatwianych POZA ZUS – u pracodawcy i w USC.
 * Każdy punkt: do kogo, kto składa, do kiedy (data liczona z terminu porodu i z harmonogramu urlopów),
 * jak wypełnić (krok po kroku), co dołączyć, podstawa prawna i – gdy jest – wstępnie wypełniony wniosek.
 */
import type { CalculationResult } from "@/models/types";
import type { CaseData } from "@/store/app";
import { GUIDES, type DocId } from "@/data/documents";

export interface PlanItem {
  id: string;
  title: string;
  to: "pracodawca" | "USC" | "lekarz";
  who: "mama" | "tata" | "oboje";
  /** do kiedy złożyć / załatwić (ISO); brak = jak najszybciej */
  due?: string;
  /** od kiedy najwcześniej */
  from?: string;
  dueLabel: string;
  why: string;
  steps: string[];
  attach: string[];
  legal: string;
  docId?: DocId;
  optional?: boolean;
}

const add = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
const pl = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export function buildPrebirthPlan(d: CaseData, r: CalculationResult): PlanItem[] {
  if (d.child.birthDate) return [];
  const due = d.child.dueDate;
  const bio = d.child.path === "biologiczny";
  const m = d.mother;
  const f = d.father;
  const momEmployee = m.title === "uop" && r.mother.eligibility.insured;
  const dadEmployee = !!f && f.title === "uop" && !!r.father?.eligibility.insured;
  const seg = (who: "matka" | "ojciec", pred: (k: string) => boolean) => r.segments.filter((s) => s.who === who && pred(s.kind));
  const dl = (id: string) => r.deadlines.find((x) => x.id === id);
  const g = (id: DocId) => GUIDES[id];
  const items: PlanItem[] = [];

  if (momEmployee) {
    items.push({
      id: "ciaza-pracodawca",
      title: "Przekaż pracodawcy zaświadczenie o ciąży",
      to: "pracodawca",
      who: "mama",
      dueLabel: "jak najszybciej",
      why: m.contractEndDate
        ? `Twoja umowa kończy się ${pl(m.contractEndDate)} – po przekazaniu zaświadczenia umowa na czas określony przedłuży się do dnia porodu (jeśli kończyłaby się po 3. miesiącu ciąży). Od tej chwili pracodawca nie może Cię też zwolnić.`
        : "Od tej chwili pracodawca nie może wypowiedzieć ani rozwiązać umowy (poza wyjątkami), nie może zlecać nadgodzin, pracy w nocy ani delegacji bez Twojej zgody.",
      steps: [
        "Poproś lekarza lub położną o zaświadczenie lekarskie potwierdzające ciążę (zwykły druk, nie e-ZLA).",
        "Złóż je w kadrach – najlepiej z kopią, na której kadry potwierdzą datę odbioru.",
        "Zapytaj o zwolnienie z pracy na badania lekarskie w czasie ciąży (płatne, art. 185 KP) i o ewentualne przeniesienie do lżejszej pracy.",
      ],
      attach: ["Zaświadczenie lekarskie potwierdzające ciążę"],
      legal: "art. 177 § 1 i § 3, art. 178, art. 185 § 2 KP",
    });
  }

  if (momEmployee && bio) {
    const x = dl("mat-before");
    items.push({
      id: "URLOP-MAC-PRZED",
      title: "Wniosek o urlop macierzyński przed porodem (jeśli chcesz zacząć wcześniej)",
      to: "pracodawca",
      who: "mama",
      due: x?.date,
      from: x?.windowStart,
      dueLabel: x ? `złóż do ${pl(x.date)} – jeśli urlop ma ruszyć ${pl(x.windowStart ?? due)}` : "min. 14 dni przed startem urlopu",
      why: "Do 6 tygodni urlopu macierzyńskiego możesz wykorzystać przed porodem – te tygodnie odejmą się od części po porodzie. Jeśli chcesz pracować do porodu, nie składasz tego wniosku.",
      steps: ["Wpisz imię i nazwisko oraz datę, od której ma się zacząć urlop (najwcześniej 6 tygodni przed terminem porodu).", "Dołącz kopię zaświadczenia lekarskiego z przewidywaną datą porodu.", ...g("URLOP-MAC-PRZED").howTo.slice(0, 1)],
      attach: ["Kopia zaświadczenia lekarskiego (zwykły druk) z przewidywaną datą porodu"],
      legal: "art. 180 § 2 KP; § 2 rozporządzenia MRPiPS z 11.03.2025",
      docId: "URLOP-MAC-PRZED",
      optional: true,
    });
  }

  if (momEmployee) {
    const par = seg("matka", (k) => k.startsWith("rodzicielski"));
    const combined = d.plan.variant === "combined";
    const date = combined ? add(due, 21) : par[0] ? add(par[0].from, -21) : dl("parental-app")?.date;
    if (date)
      items.push({
        id: "URLOP-RODZ",
        title: combined ? "Wniosek o urlop rodzicielski od razu po macierzyńskim (81,5% za cały okres)" : "Wniosek o urlop rodzicielski",
        to: "pracodawca",
        who: "mama",
        due: date,
        dueLabel: combined ? `najpóźniej 21 dni po porodzie – przy terminie ${pl(due)}: do ${pl(date)}` : `najpóźniej 21 dni przed startem rodzicielskiego – do ${pl(date)}`,
        why: combined ? "Złożenie wniosku o cały urlop rodzicielski do 21 dni po porodzie daje 81,5% zasiłku za cały rok. Przygotuj go już teraz – po porodzie wystarczy wpisać datę urodzenia i złożyć." : "Wniosek złożony na czas zapewnia ciągłość zasiłku po urlopie macierzyńskim.",
        steps: ["Wpisz imię i nazwisko, okres urlopu rodzicielskiego (od dnia po końcu macierzyńskiego) i to, że to pierwsza część.", "Dołącz oświadczenie, czy drugi rodzic będzie korzystał z urlopu rodzicielskiego w tym samym czasie.", "Po porodzie dopisz imię i nazwisko oraz datę urodzenia dziecka i złóż w kadrach."],
        attach: ["Odpis skrócony aktu urodzenia (tylko gdy zasiłek wypłaca pracodawca)", "Oświadczenie o zamiarach drugiego rodzica"],
        legal: "art. 182¹d § 1 KP; art. 30a ustawy zasiłkowej; § 15 rozporządzenia MRPiPS",
        docId: "URLOP-RODZ",
      });
    if (d.plan.combineWithWork.enabled && d.plan.combineWithWork.who === "matka") {
      const x = dl("combine-work");
      if (x)
        items.push({
          id: "URLOP-LACZENIE",
          title: "Wniosek o łączenie urlopu rodzicielskiego z pracą",
          to: "pracodawca",
          who: "mama",
          due: x.date,
          dueLabel: `najpóźniej 21 dni przed powrotem do pracy – do ${pl(x.date)}`,
          why: "Praca do 1/2 etatu w czasie urlopu rodzicielskiego wydłuża urlop proporcjonalnie.",
          steps: ["Podaj wymiar czasu pracy (nie więcej niż 1/2 etatu) i okres łączenia.", "Napisz, jak chcesz wykorzystać część urlopu, o którą się on wydłuży.", ...g("URLOP-LACZENIE").howTo.slice(0, 1)],
          attach: [],
          legal: "art. 182¹e § 2 KP; § 16 rozporządzenia MRPiPS",
          docId: "URLOP-LACZENIE",
        });
    }
  }

  if (dadEmployee && d.plan.paternity.enabled) {
    items.push({
      id: "URLOP-OJC",
      title: "Wniosek taty o urlop ojcowski",
      to: "pracodawca",
      who: "tata",
      due: add(due, -7),
      dueLabel: bio ? `min. 7 dni przed startem – jeśli od porodu: do ${pl(add(due, -7))}` : `min. 7 dni przed startem – jeśli od przyjęcia dziecka (${pl(due)}): do ${pl(add(due, -7))}`,
      why: bio
        ? "2 tygodnie (naraz albo 2 × 7 dni) do ukończenia przez dziecko 12 miesięcy, zasiłek 100%. Wniosek możesz złożyć przed porodem z przewidywaną datą – kadry przesuną start, gdy dziecko urodzi się w innym dniu."
        : "2 tygodnie (naraz albo 2 × 7 dni) w ciągu 12 miesięcy od uprawomocnienia się postanowienia o przysposobieniu, zasiłek 100%.",
      steps: [`Wpisz imię i nazwisko oraz okres urlopu ojcowskiego (np. od dnia ${bio ? "porodu" : "przyjęcia dziecka"} przez 14 dni).`, bio ? "Po porodzie dostarcz odpis skrócony aktu urodzenia (gdy zasiłek wypłaca pracodawca)." : "Dołącz kopię prawomocnego postanowienia sądu o przysposobieniu.", "Złóż oświadczenie, czy korzystałeś już z urlopu ojcowskiego na to dziecko."],
      attach: bio ? ["Odpis skrócony aktu urodzenia dziecka (po porodzie)", "Oświadczenie o dotychczas wykorzystanym urlopie ojcowskim"] : ["Kopia postanowienia sądu o przysposobieniu", "Oświadczenie o dotychczas wykorzystanym urlopie ojcowskim"],
      legal: "art. 182³ KP; § 17 rozporządzenia MRPiPS",
      docId: "URLOP-OJC",
    });
    if (bio) items.push({
      id: "okolicznosciowy",
      title: "2 dni wolnego taty z powodu narodzin dziecka",
      to: "pracodawca",
      who: "tata",
      due: add(due, 14),
      dueLabel: "w dniach wokół porodu – zgłoś pracodawcy z wyprzedzeniem",
      why: "Pracownikowi przysługują 2 dni płatnego zwolnienia od pracy z powodu urodzenia dziecka – niezależnie od urlopu ojcowskiego.",
      steps: ["Uprzedź przełożonego, że będziesz potrzebować 2 dni wolnego po porodzie.", "Po porodzie złóż wniosek o zwolnienie okolicznościowe i dostarcz odpis aktu urodzenia."],
      attach: ["Odpis skrócony aktu urodzenia"],
      legal: "§ 15 rozporządzenia MPiPS z 15.05.1996 w sprawie usprawiedliwiania nieobecności w pracy",
    });
  }

  if (dadEmployee && d.plan.fatherParentalWeeks > 0) {
    const p = seg("ojciec", (k) => k.startsWith("rodzicielski"));
    if (p[0])
      items.push({
        id: "URLOP-RODZ-TATA",
        title: `Wniosek taty o urlop rodzicielski (${d.plan.fatherParentalWeeks} tyg.)`,
        to: "pracodawca",
        who: "tata",
        due: add(p[0].from, -21),
        dueLabel: `najpóźniej 21 dni przed startem (${pl(p[0].from)}) – do ${pl(add(p[0].from, -21))}`,
        why: "9 tygodni urlopu rodzicielskiego przysługuje wyłącznie tacie – jeśli ich nie weźmie, przepadają.",
        steps: ["Wpisz okres urlopu rodzicielskiego i liczbę części wykorzystanych dotąd przez oboje rodziców.", "Dołącz oświadczenie mamy o okresie jej urlopu rodzicielskiego.", "Dołącz odpis skrócony aktu urodzenia dziecka."],
        attach: ["Odpis skrócony aktu urodzenia dziecka", "Oświadczenie drugiego rodzica"],
        legal: "art. 182¹a § 4 i art. 182¹d KP; § 15 rozporządzenia MRPiPS",
        docId: "URLOP-RODZ-TATA",
      });
  }

  if (bio) {
    items.push({
      id: "uznanie-ojcostwa",
      title: "Uznanie ojcostwa przed porodem (jeśli nie jesteście małżeństwem)",
      to: "USC",
      who: "oboje",
      due: add(due, -14),
      dueLabel: `najlepiej przed porodem – np. do ${pl(add(due, -14))}`,
      why: "Gdy rodzice nie mają ślubu, ojcostwo trzeba uznać – wtedy przy rejestracji urodzenia tata zostanie od razu wpisany do aktu, a dziecko może nosić jego nazwisko. Małżeństwa pomijają ten punkt.",
      steps: ["Umówcie się w dowolnym USC (lub w konsulacie) – oboje rodzice muszą być osobiście.", "Weźcie dowody osobiste i zaświadczenie lekarskie potwierdzające ciążę.", "Kierownik USC przyjmie oświadczenia matki i ojca i sporządzi protokół. Przy rejestracji urodzenia dane taty trafią do aktu automatycznie."],
      attach: ["Dowody osobiste obojga rodziców", "Zaświadczenie lekarskie o ciąży"],
      legal: "art. 73 i art. 75 § 1 Kodeksu rodzinnego i opiekuńczego",
      optional: true,
    });
    items.push({
      id: "USC-REJESTRACJA",
      title: "Przygotuj rejestrację urodzenia w USC",
      to: "USC",
      who: "oboje",
      due: add(due, 21),
      dueLabel: `21 dni od porodu – przy terminie ${pl(due)}: do ${pl(add(due, 21))}`,
      why: "Szpital sam przekaże do USC kartę urodzenia. Wy zgłaszacie urodzenie i wybieracie imię – wtedy dziecko dostaje akt urodzenia, PESEL i meldunek. Bez tego nie złożycie 800+ ani wniosków urlopowych.",
      steps: ["Wybierzcie imię (lub dwa) i nazwisko dziecka; przy różnych nazwiskach rodziców ustalcie je wcześniej.", "Po porodzie zgłoście urodzenie online na gov.pl (profil zaufany / mObywatel) albo osobiście w USC właściwym dla miejsca urodzenia.", "Zaznaczcie, czy chcecie od razu zameldowanie i odpis skrócony aktu (pierwszy jest bezpłatny)."],
      attach: ["Dowody osobiste", "Akt małżeństwa – jeśli ślub był za granicą"],
      legal: "art. 54 ustawy Prawo o aktach stanu cywilnego",
      docId: "USC-REJESTRACJA",
    });
  }

  return items.sort((a, b) => (a.due ?? "0000").localeCompare(b.due ?? "0000"));
}
