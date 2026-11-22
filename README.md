# Przewodnik Przyszłego Rodzica · ZUS 2026

MVP aplikacji webowej (RWD) na HackNation 2026 – wyzwanie Zakładu Ubezpieczeń Społecznych.
Prowadzi osoby planujące rodzicielstwo, kobiety w ciąży, rodziców biologicznych, adopcyjnych i rodziny zastępcze
przez ustalenie uprawnień, wybór najkorzystniejszego wariantu zasiłku i złożenie kompletnych wniosków we właściwym miejscu.

**Stan prawny: po 24.10.2026 r.** Druki ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15, Z-12. ZUR i ZAO połączono z ZAM,
Z-15 zastąpił Z-15A i Z-15B, Z-3b zlikwidowano.

## Spis treści

- [Demo online](#demo-online)
- [Uruchomienie](#uruchomienie)
- [Logowanie testowe i 100 rodzin](#logowanie-testowe-i-100-rodzin)
- [Ekrany i nawigacja](#ekrany-i-nawigacja)
- [Sprawy, statusy i powiadomienia](#sprawy-statusy-i-powiadomienia)
- [Sprawdź dokument – potok analizy](#sprawdź-dokument--potok-analizy)
- [Oficjalne druki ZUS](#oficjalne-druki-zus-wstępne-wypełnienie-konwerter-pdf--json-formuły-sprawdzania)
- [Funkcje wspierane przez AI](#-funkcje-wspierane-przez-ai-wymóg-regulaminu)
- [Architektura](#architektura) · [REST API](#rest-api)
- [Wygląd, maskotka i grafiki](#wygląd-maskotka-i-grafiki)
- [Źródła, materiały i rozwiązania zewnętrzne](#hierarchia-źródeł)
- [Co jest symulowane / ograniczenia MVP](#co-jest-symulowane--ograniczenia-mvp)

## Demo online

**https://przewodnik-przyszlego-rodzica.vercel.app**

1. Na ekranie logowania wybierz **Zaloguj się** i **Mama** → „Zaloguj przez mObywatel”. Kod QR „skanuje się” sam po kilku sekundach (symulacja).
2. Urządzenie zostaje przypięte do jednej z 100 fikcyjnych rodzin – patrz [Logowanie testowe](#logowanie-testowe-i-100-rodzin).
3. Przykładowe dokumenty PDF do sprawdzenia: menu **Sprawdź dokument** → sprawy testowe.
4. Panel parametrów legislacyjnych: link „Wejście dla administratora ZUS” pod formularzem logowania.

## Uruchomienie

Wymagany Node.js ≥ 20.9.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 22 testy: silnik (15 reguł prawnych) + druki ZUS (7)
npm run typecheck    # tsc --noEmit
npm run lint
npm run samples      # (opcjonalnie) ponowne wygenerowanie przykładowych PDF w public/samples
npm run build && npm start
```

Funkcje AI (Claude) są opcjonalne. Bez klucza aplikacja działa w pełni: zamiast AI używa parsera regułowego i wyszukiwania w bazie wiedzy.

```bash
cp .env.example .env.local   # ustaw ANTHROPIC_API_KEY (albo ANTHROPIC_AUTH_TOKEN)
                             # AI_DISABLED=1 wyłącza AI mimo ustawionego klucza
```

Wdrożenie: Vercel, region **fra1** (`vercel.json`). `next.config.ts` dołącza do paczek funkcji pliki z `public/samples`,
`public/formularze` i `public/fonts`, bo API czyta je z dysku.

## Logowanie testowe i 100 rodzin

Ekran startowy (`/`): przełączniki **Zaloguj się / Zarejestruj się** oraz **Mama / Tata**, potem kod QR w mObywatelu (symulacja).

- **Zaloguj się**: konto już istnieje, aplikacja ma pełne dane rodziny z ZUS (mama i tata z tej samej rodziny).
- **Zarejestruj się (Mama)**: dane osobowe i ubezpieczeniowe „z mObywatela i ZUS” (PESEL, płatnik, składki, e-ZLA).
  Dane dziecka wpisuje rodzic w kreatorze `/start`, w czterech krokach:
  1. **Twoje dziecko**: narodziny / adopcja / rodzina zastępcza, termin, liczba dzieci, płeć i imię każdego dziecka.
  2. **Sytuacja ubezpieczeniowa**: dane z ZUS do sprawdzenia i ewentualnej poprawy.
  3. **Drugi rodzic**: krok opcjonalny („Pominę – dodam później”).
  4. **Okoliczności szczególne**, m.in. utrata pracy przez upadłość lub likwidację pracodawcy.
- **Tata rejestruje się wyłącznie z linku zaproszenia** (`/?zaproszenie=KOD`), który mama tworzy w *Ustawienia → Partner*.
  Link od razu ustawia „Zarejestruj się” + „Tata”. Dane taty też pochodzą „z mObywatela i ZUS”.
- **Po porodzie** pojawia się karta „… już na świecie?”. Rodzic podaje datę urodzenia i dane z aktu (imiona, nazwisko,
  płeć, godzina, masa, miejsce, PESEL), które trafiają do wniosków (USC, ZAM, Z-15, wnioski urlopowe).
- **Pula 100 fikcyjnych rodzin** (`src/data/families.ts`, generator deterministyczny, poprawne PESEL/NIP):
  - ok. 90% to narodziny (część już po porodzie, wcześniaki, bliźnięta), ok. 10% to adopcje i rodziny zastępcze;
  - różne umowy, wielkości firm, zaległości w składkach, L4.
- **Tryb testowy**: urządzenie jest „przypięte” do jednej rodziny, tak jak jedna tożsamość w mObywatelu. Przycisk
  „Wyloguj się i wylosuj inną rodzinę” jest na ekranie logowania, w menu i w *Ustawienia → Konto*; opis scenariuszy jest pod ikonką ⓘ.
- **Administrator ZUS**: link „Wejście dla administratora ZUS” prowadzi do `/admin` (parametry legislacyjne) oraz do kalkulatora i walidatora PDF.

Rodziny 1–5 to przygotowane scenariusze szczególne (`src/data/profiles.ts`):

1. **Anna**: UoP w małej firmie (12 os., zasiłek wypłaca ZUS), L4 z kodem B (reset 270 dni), łączenie rodzicielskiego z pracą na 1/2 etatu.
2. **Magdalena**: JDG od 6 mies. (art. 48a), zaległość 312,45 zł > 48,06 zł, więc blokada z art. 2a.
3. **Karolina i Tomasz**: bliźnięta z 27. tyg. (940 g), 52 dni w szpitalu, uzupełniający urlop 8 tyg., wariant 81,5%, podział urlopu.
4. **Julia**: studentka < 26 lat na zleceniu, bez ubezpieczenia, przysługuje świadczenie rodzicielskie.
5. **Ewa i Marek**: adopcja 3-latka, zlecenie z dobrowolnym chorobowym, płatnik > 20 os.

## Ekrany i nawigacja

**Konto Mamy:**

| Sekcja menu | Ekran | Ścieżka |
|---|---|---|
| — | **Start**: „Na teraz” (od najpilniejszych; złożone sprawy znikają), plan przed porodem, „Moje sprawy w ZUS” ze statusami, tracker ciąży, karta „Dodaj partnera” | `/panel` |
| — | **Moja ciąża**, trzy zakładki: *Kalendarz* (termin porodu, okna badań, wizyty, terminy ZUS/USC, samopoczucie i objawy, raport PDF dla lekarza), *Torba i wyprawka*, *Poradniki i połóg* | `/ciaza` |
| Pieniądze i formalności | **Moje sprawy**: plan przed porodem (wnioski do pracodawcy i USC z terminami) + wnioski i dokumenty pogrupowane w Do zrobienia / W toku / Załatwione | `/wnioski` |
| | **Ile i kiedy dostanę**: oś czasu świadczeń, Centrum alertów („Na co uważać”), terminy | `/swiadczenia` |
| | **Policz zasiłek**: kalkulator w 7 zakładkach (Ciąża i L4, Podstawa, Urlopy, Podział i praca, 81,5% vs 100/70, Opiekuńczy, Świadczenia rodzinne) | `/kalkulator?tab=…` |
| | **Sprawdź dokument**: walidator PDF, teczka sprawy, sprawy testowe | `/dokumenty` |
| Pomoc | **Pomoc i telefony** · **Gdzie to załatwić** (mapa placówek) · **Ustawienia** (Profil, Dane z ZUS, Wiadomości z ZUS, Partner, Powiadomienia, Konto) | `/wsparcie`, `/placowki`, `/ustawienia` |

Dolny pasek na telefonie: Start · Sprawy · Ciąża · Pieniądze.

**Konto Taty / Partnera**: widzi tylko sekcje włączone przez mamę w *Ustawienia → Partner*:

- formalności i urlop taty: **Moje sprawy i urlop**, `/partner`;
- kwoty zasiłków: **Ile i kiedy dostanę**;
- kalendarz ciąży: **Nasza ciąża** (bez tej zgody sekcja nazywa się „Przygotowania”);
- torba i wyprawka;
- objawy.

Linki do niedostępnych sekcji są przekierowywane na ich odpowiednik (`resolveHref` w `src/components/layout/nav.ts`).

**Administrator ZUS**: `/admin` (parametry legislacyjne), kalkulator, walidator PDF.

`/organizacja` to dawna zakładka, przekierowuje na `/ciaza`.

## Sprawy, statusy i powiadomienia

- **Brak ręcznego odhaczania dokumentów urzędowych.** Każda sprawa ma status nadawany przez system
  (`src/services/case-sync.ts`, odpytywanie co 10 s):
  *Niezłożony → Wysłany / zarejestrowany → W trakcie weryfikacji → Przyznany* albo *Wymaga uzupełnienia*.
  W demonstracji tempo jest przyspieszone: weryfikacja po 15 s, decyzja po 45 s.
- **Panel sprawy** otwiera się po kliknięciu wniosku (także z listy „Inne druki” i z wyszukiwarki). Pokazuje status i etapy oraz dwie zakładki:
  - *Jak załatwić*: instrukcja, częste błędy, załączniki, pusty druk z `public/formularze`, opcjonalny przykład wypełnienia i link do zus.pl;
  - *Podgląd wniosku*: druk wypełniony danymi z profilu, edycja każdego pola, kontrola wykluczających się zaznaczeń, pobranie PDF.

  Treści są w `src/data/documents.ts`, a ikony druków w `src/components/cases/doc-icon.tsx`.
- **Plan przed porodem** (`src/lib/prebirth-plan.ts`) obejmuje sprawy załatwiane poza ZUS, u pracodawcy i w USC.
  Każdy punkt podaje: do kogo, kto składa, do kiedy (termin liczony z daty porodu i harmonogramu urlopów), jak wypełnić i co dołączyć.
- **Powiadomienia**:
  - dzwonek z licznikiem i krótkie toasty (ok. 3,5 s);
  - e-mail (`POST /api/notify/email`, symulacja);
  - push (Notification API przeglądarki; w aplikacji mobilnej byłyby to APNs/FCM).

  W *Ustawienia → Powiadomienia* użytkownik wybiera kanał **osobno dla każdego tematu**: terminy, statusy, odpowiedzi ZUS, wizyty, tydzień ciąży, ryzyka.
- **Wiadomości z ZUS** są w *Ustawienia → Wiadomości z ZUS*. Odpowiedź przychodzi po ok. 9 s (symulacja) i trafia do skrzynki, pod dzwonek i na e-mail.
- **Ikonka ⓘ** stoi przy „trudnych” słowach (`Term`, `src/data/glossary.ts`) i przy polach formularzy (`Field info=…`), np. „skąd wziąć liczbę ubezpieczonych”.
- **Cytaty przepisów**: oznaczenia przepisów występują jako etykiety `LegalChip` i w tekście (`LegalText`, wykrywane automatycznie).
  Po najechaniu lub dotknięciu pokazują brzmienie przepisu (jeśli jest w bazie) i link do aktu.
  Źródło: `src/data/legal-quotes.ts` (przed wdrożeniem do weryfikacji przez prawnika).
- **Ryzyka dla świadczeń** opisuje *Ile i kiedy dostanę → Centrum alertów → Na co uważać* (`src/data/risks.ts`): utrata prawa, zmiana wymiaru lub wysokości świadczenia.
- **Wyszukiwarka** (lupka w nagłówku, Ctrl/⌘+K) i **ZUSia** korzystają z jednego silnika (`src/lib/search.ts`) i jednej bazy treści (`src/data/corpus.ts`).
  - Baza obejmuje: pytania, pojęcia, druki, poradniki, listy, ryzyka, telefony, organizacje, placówki i funkcje aplikacji.
  - Silnik rozumie odmianę („szpitala” = „szpital”), pomija słowa nieistotne i zna synonimy („spakować” → torba).
  - Słabe dopasowania są odrzucane – wtedy ZUSia mówi wprost, że nie wie.

## Sprawdź dokument – potok analizy

Ekran `/dokumenty` przyjmuje jeden lub kilka PDF-ów jednej sprawy (**teczka**, np. ZAM + Z-3 albo poświadczenie + ZAS-53)
i ocenia je razem. Pliki w UI mogą mieć do 4,4 MB (limit żądania funkcji na Vercel).

1. **Odczyt** (`src/services/documents/analyze.ts`, `POST /api/documents/analyze`), zależnie od rodzaju pliku:
   - **edytowalny druk ZUS** (pola AcroForm, rozpoznawany po nazwach pól): dane wyłącznie z pól formularza, **bez AI** (`services/forms/review.ts`);
   - **PDF z tekstem**: parser regułowy (`documents/parse.ts`), opcjonalnie wzbogacony mapowaniem AI (Structured Output);
   - **skan bez warstwy tekstowej**: odczyt AI (model wizyjny); bez AI aplikacja prosi o PDF z tekstem.
2. **Walidacja formalna** (`documents/validate.ts`, Zał. 1–7 rozporządzenia) oraz sumy kontrolne PESEL/NIP/REGON (`documents/identifiers.ts`).
   Dla druków ZUS dochodzą formuły sprawdzania druku (`services/forms/check.ts`).
3. **Scalenie teczki i ocena** (`POST /api/documents/evaluate`, `documents/merge.ts`, `documents/evaluate.ts`):
   - dokumenty scala się w jeden ustandaryzowany JSON i sprawdza ich spójność;
   - po PESEL aplikacja ustala, czy dokument należy do mamy czy do taty;
   - brakujące informacje są uzupełniane z aplikacji (oznaczone „z aplikacji”).
4. **Werdykt**: deterministyczny silnik uprawnień i kalkulator liczą wynik z podstawą krok po kroku.
5. **Korekta**: każde odczytane pole można poprawić; werdykt przelicza się na bieżąco.
   Karta „Porównanie z danymi w aplikacji” pokazuje pole po polu różnice między drukiem użytkownika a drukiem,
   który aplikacja wypełniłaby sama (`components/documents/form-compare.tsx`).

**Sprawy testowe** (`src/data/samples.ts`, pliki w `public/samples`, generator `scripts/generate-samples.ts`): 9 dokumentów w 7 teczkach.
Dane są fikcyjne, sumy kontrolne PESEL/NIP poprawne, z wyjątkiem celowo błędnego `Z-3_bledne_dane.pdf`.

## Oficjalne druki ZUS: wstępne wypełnienie, konwerter PDF → JSON, formuły sprawdzania

W `public/formularze` są **edytowalne wersje „Wypełnij i wydrukuj” z zus.pl**: ZAM, ZAS-53, Z-15, Z-12, ZUS ZCNA, Z-3, Z-3a, ZUS ZUA
(opis plików: [`public/formularze/README.md`](public/formularze/README.md)).

Opis pól każdego druku jest w jednym miejscu: `src/data/official-forms.ts`. Zawiera on: nazwę pola AcroForm, etykietę, sekcję,
skąd brać wartość, jak ją odczytać oraz grupy wykluczających się zaznaczeń. Na tej podstawie działają trzy funkcje:

| Funkcja | Moduł | REST | Co robi |
|---|---|---|---|
| **Wstępne wypełnienie** (potok 1) | `fillValues()` w `data/official-forms.ts`, `lib/official-pdf.ts`, `services/forms/prefill.ts` | `POST /api/forms/prefill` `{ form, profile \| input \| values, who?, format: "json" \| "pdf" }` | Dane z mObywatela/ZUS (symulacja) i wynik silnika trafiają do pól oryginalnego druku; wynikiem jest edytowalny PDF. W aplikacji: *Moje sprawy → wniosek → Podgląd wniosku → Edytuj przed pobraniem → Pobierz*. |
| **Konwerter PDF → JSON** (potok 2) | `services/forms/convert.ts` (`pdfToJson`) | `POST /api/forms/convert` (multipart `file`) | Z edytowalnego druku zwraca rozpoznany formularz, pola z etykietami i wartościami oraz ustandaryzowany dokument (wejście do silnika). |
| **Formuły sprawdzania** | `services/forms/check.ts` (`checkForm`) | `POST /api/forms/check` `{ form, values }` | Sprawdza sumy kontrolne (PESEL, NIP, REGON, NRB – IBAN mod 97, dowód osobisty), daty dd/mm/rrrr, kod pocztowy i pola wymagane. Wykrywa **wykluczające się zaznaczenia** (np. TAK i NIE, „urodzenie dziecka” i „przewidywana data porodu”) i pilnuje zależności „zaznaczone X ⇒ wypełnij Y”. |

`GET /api/forms` zwraca listę plików w `public/formularze` i opis druków z linkiem do strony formularza na zus.pl.

Testy w `tests/forms.test.ts` sprawdzają:
- wypełnienie wszystkich druków dla 100 rodzin bez błędów;
- przejście PDF → JSON bez strat;
- zgodność cyklu „pobrany wniosek → Sprawdź dokument” z aplikacją;
- wykrywanie błędów.

**Wnioski urlopowe do pracodawcy** nie mają urzędowego druku. Aplikacja generuje je według rozporządzenia MRPiPS z 11.03.2025 (`lib/pdf.ts`).
**800+** składa się wyłącznie elektronicznie; aplikacja przygotowuje komplet danych do wniosku.

## ⚡ Funkcje wspierane przez AI (wymóg regulaminu)

AI (model Claude, `claude-opus-5-5`, `src/services/ai/client.ts`) jest używane **wyłącznie** w dwóch miejscach, oznaczonych w UI etykietą „Wspierane przez AI”:

1. **Mapowanie dokumentów** (`src/services/ai/extract.ts`) w *Sprawdź dokument*:
   - Structured Output do ustandaryzowanego JSON;
   - odczyt skanów bez warstwy tekstowej (model wizyjny);
   - wynik jest scalany z parserem regułowym (identyfikatory z poprawną sumą kontrolną mają pierwszeństwo), a potem walidowany deterministycznie;
   - edytowalne druki ZUS są czytane z pól formularza, bez AI.
2. **ZUSia – czat** (`src/services/ai/bot.ts`):
   - odpowiada prostym językiem wyłącznie na podstawie bazy wiedzy (streszczenia Poradnika ZUS 2026);
   - bez klucza API, a także przy odmowie lub błędzie modelu, odpowiada z wyszukiwania regułowego.

**Bezpieczeństwo i RODO** (`src/services/ai/privacy.ts`, `src/app/api/bot/route.ts`):

- **Wejście**: walidacja (zod), limit 1000 znaków i 20 zapytań/min na IP, usuwanie znaków sterujących i niewidocznych.
- **Prompt injection**: wykryte próby (zmiana roli, ujawnienie instrukcji) dostają odpowiedź bez wywołania modelu.
  Pytanie użytkownika jest opakowane w `<pytanie_uzytkownika>` i traktowane jako dane; nadrzędne zasady są w prompcie systemowym.
- **Filtr odpowiedzi**: tylko linki zus.pl / gov.pl / ISAP i wewnętrzne ścieżki z białej listy.
- **Pseudonimizacja**: PESEL, NIP, rachunek, e-mail, telefon, dowód, nazwiska i adresy z etykiet zamieniane są przed wysłaniem do modelu
  na tokeny `[PESEL_1]`…, a odtwarzane po stronie serwera. **Skany** idą do modelu w całości, bo model musi zobaczyć obraz.
- **Zgoda**: na funkcje AI (w tym wysyłkę skanów) – do wyłączenia w *Ustawienia → Konto*.

**Region przetwarzania:** funkcje serwerowe działają w regionie Vercel **fra1 (Frankfurt)**. Dokumenty są przetwarzane w pamięci i nie są zapisywane.

**AI nigdy nie liczy kwot ani nie rozstrzyga o uprawnieniach** – robi to `services/engine`, pokryty testami.
Pozostałe funkcje (kalkulator, walidator, routing płatnika, terminy, Centrum alertów, panel admina, druki ZUS) są w 100% deterministyczne.

## Architektura

```
src/
├── app/                 # ekrany (App Router) i REST API (app/api/**/route.ts)
├── models/              # typy i schematy zod: CaseInput, CalculationResult, LegalConfig, ExtractedDocument, statusy spraw
├── services/
│   ├── engine/          # DETERMINISTYCZNY silnik uprawnień i kalkulator (zero AI)
│   │   ├── base.ts          # podstawa wymiaru – art. 36–49 (w tym 48a)
│   │   ├── eligibility.ts   # tytuł ubezpieczenia, wyczekiwanie (art. 4), zadłużenie (art. 2a), płatnik (art. 61)
│   │   ├── sickness.ts      # chorobowy w ciąży, 33/14 dni, 270 dni, kod B, rehabilitacyjne
│   │   ├── maternity.ts     # macierzyński, uzupełniający, rodzicielski, łączenie z pracą, ojcowski, adopcja, 81,5%
│   │   ├── deadlines.ts     # terminy graniczne
│   │   ├── family.ts        # 800+, becikowe, Aktywny Rodzic, świadczenie rodzicielskie
│   │   ├── dates.ts         # arytmetyka dat
│   │   └── index.ts         # calculate() + Red Flags
│   ├── documents/       # analiza PDF (unpdf), parser regułowy, walidator Zał. 1–7, PESEL/NIP/REGON, scalanie teczki, ocena
│   ├── forms/           # oficjalne druki ZUS: wstępne wypełnienie, konwerter PDF → JSON, formuły sprawdzania, przegląd druku
│   ├── ai/              # ⚡ funkcje wspierane przez AI (wyraźnie oddzielone) + pseudonimizacja i ochrona czatu
│   ├── config/          # magazyn konfiguracji legislacyjnej (panel admina)
│   ├── case-sync.ts     # symulacja statusów spraw w ZUS
│   └── integrations.ts  # symulacje mObywatel / PUE / e-ZLA / USC / wysyłki
├── lib/                 # wyszukiwarka, sprawy, plan przed porodem, priorytety, generowanie PDF, odczyt/zapis AcroForm
├── store/app.ts         # stan aplikacji (zustand, zapis w przeglądarce): konto, rodzina, statusy, partner, zgody
├── hooks/               # useCalculation, useMounted
├── components/          # UI (Radix, vaul, sonner, framer-motion, Tailwind)
└── data/                # 100 rodzin i profile testowe, druki i opis pól, sprawy PDF, baza wiedzy, korpus wyszukiwarki,
                         # słownik pojęć, cytaty przepisów, ryzyka, katalog wsparcia, placówki
tests/                   # engine.test.ts (reguły prawne), forms.test.ts (druki ZUS)
scripts/                 # generate-samples.ts – przykładowe PDF
public/                  # formularze/ (druki ZUS), samples/ (sprawy testowe), fonts/ (Lato do PDF), brand/ (ZUSia, logo)
```

**Backend:** zgodnie z dopuszczoną elastycznością backend zrealizowano w TypeScript (Next.js 16 Route Handlers – REST API),
żeby dostarczyć jedno spójne, łatwe do wdrożenia MVP. Silnik jest czystym modułem TS, gotowym do przeniesienia do osobnej usługi.

**Konfiguracja legislacyjna** zmieniana w panelu admina jest zapisywana:
- lokalnie w pliku `.data/legal-config.json`;
- na Vercel w katalogu tymczasowym instancji, czyli nietrwale.

W produkcji byłaby to tabela PostgreSQL z wersjonowaniem.

### REST API

| Metoda | Endpoint | Opis |
|---|---|---|
| POST | `/api/calculate` | `CaseInput` → `CalculationResult` (deterministycznie) |
| POST | `/api/documents/analyze` | PDF (multipart `file`, `ai=0\|1`) lub `{ sampleId }` → odczyt, braki formalne, ustandaryzowany JSON, werdykt |
| POST | `/api/documents/evaluate` | `{ documents[], profile? }` – ocena teczki; `{ document, fieldFrom?, profile? }` – przeliczenie po korekcie pól |
| GET | `/api/documents/samples` | lista spraw testowych i dostępność AI |
| GET | `/api/forms` | pliki w `public/formularze` i opis oficjalnych druków (link do zus.pl, liczba pól) |
| POST | `/api/forms/prefill` | wstępne wypełnienie druku – JSON albo edytowalny PDF |
| POST | `/api/forms/convert` | konwerter PDF → JSON (pola druku, ustandaryzowany dokument, formuły sprawdzania) |
| POST | `/api/forms/check` | formuły sprawdzania wartości pól druku |
| GET / PATCH | `/api/config` | parametry legislacyjne (PATCH: nagłówek `x-role: admin`) |
| POST | `/api/config/reset` | przywrócenie wartości ustawowych 2026 (`x-role: admin`) |
| GET | `/api/config/history` | historia zmian parametrów |
| POST | `/api/bot` | ⚡ ZUSia (AI z fallbackiem regułowym) |
| GET | `/api/integrations/zus?profile=` | symulacja PUE/eZUS, zaświadczenia o niezaleganiu, e-ZLA |
| POST | `/api/integrations/submit` | symulacja wysyłki wniosku + estymacja czasu rozpatrzenia |
| POST | `/api/integrations/status` | symulacja pobrania statusów spraw z ZUS |
| POST | `/api/notify/email` | symulacja wysyłki powiadomienia e-mail |
| GET | `/api/profiles` | profile testowe |
| GET | `/api/health` | status, wersja konfiguracji, dostępność AI |

Przykład:

```bash
curl -X POST localhost:3000/api/forms/prefill -H 'content-type: application/json' \
  -d '{"form":"ZAM","profile":"rodzina-042","format":"pdf"}' -o ZAM-wypelniony.pdf
```

## Wygląd, maskotka i grafiki

Wygląd:
- jasny motyw: białe tło, karty w delikatnej szarości, jedno obramowanie, bez cieni;
- czcionka **Lato** z fallbackiem Helvetica, tekst podstawowy 16 px, kontrast tekstu ≥ 4.5:1;
- akcent w zieleni R51 G118 B60 (`#33763C`, zmienna `--brand`).

Zgodnie z wytycznymi [impeccable](https://github.com/pbakaus/impeccable) nie ma gradientów, rozmyć, emoji w roli ikon ani zagnieżdżonych kart.
Ruch jest krótki (ease-out) i respektuje `prefers-reduced-motion`.

| Plik | Użycie |
|---|---|
| `public/brand/zusia.png` | ZUSia z identyfikatorem – awatar czatu |
| `public/brand/zusia-pakunek.png` | ZUSia z pakunkiem ZUS – ekran logowania; źródło favicony `src/app/icon.png` |
| `public/brand/zusia-lot.png`, `zusia-lot.gif` | ZUSia w locie – ekran błędu |
| `public/brand/logo-aplikacji.png` | logo aplikacji (1:1) – nagłówek, menu, `src/app/apple-icon.png` |
| `public/logo-zus.png` | logo ZUS – ekran logowania i nagłówek |

Logo zawsze renderujemy z zablokowanymi proporcjami: `aspect-square` + `object-contain`, a logo ZUS jako `h-* w-auto`.

## Hierarchia źródeł

Pełna treść zadania ZUS → Załącznik (wymiary/stawki 2026) → ustawa zasiłkowa → Kodeks pracy →
rozp. z 27.09.2026 (Zał. 1–7, § 13 ust. 2) → rozp. z 11.03.2025 (wnioski urlopowe) → Poradnik ZUS 2026.
Każdy wynik silnika niesie cytowanie podstawy prawnej.

## Materiały konkursowe

Materiały przekazane przez ZUS trzymamy lokalnie w `wytyczne/materialy`; folder jest w `.gitignore`, więc nie ma go w repozytorium.
Zawiera:
- pełną treść zadania i regulamin;
- wyciągi z Kodeksu pracy i ustawy zasiłkowej;
- rozporządzenia;
- Poradnik dla rodziców 2026 i załącznik z wymiarem zasiłków.

Cytaty przepisów KP i ustawy zasiłkowej w `src/data/legal-quotes.ts` są zgodne z tymi wyciągami (Dz.U. z 2026 r.).

## Rozwiązania zewnętrzne (regulamin § 4 ust. 1)

| Rozwiązanie | Zastosowanie | Licencja |
|---|---|---|
| Next.js, React | framework aplikacji (frontend + REST API) | MIT |
| Tailwind CSS | style | MIT |
| Radix UI, vaul, sonner | dymki, okna, panele, powiadomienia | MIT |
| framer-motion | animacje | MIT |
| zustand, zod | stan aplikacji, walidacja danych | MIT |
| lucide-react | ikony | ISC |
| Leaflet, react-leaflet | mapa placówek | BSD-2 / Hippocratic |
| OpenStreetMap | podkład mapy (kafelki) | ODbL – © współtwórcy OSM |
| pdf-lib, @pdf-lib/fontkit | wypełnianie druków ZUS i generowanie wniosków PDF | MIT |
| unpdf (pdf.js) | odczyt tekstu z PDF | MIT / Apache-2.0 |
| Lato (Fontsource, Google Fonts) | krój pisma w UI i w PDF | OFL |
| Claude API (Anthropic, `@anthropic-ai/sdk`) | funkcje AI: mapowanie dokumentów, czat ZUSi | usługa komercyjna |
| Google Maps (link „Wyznacz trasę”) | nawigacja do placówki (link zewnętrzny) | – |

Maskotka ZUSia i logo aplikacji to materiały graficzne zespołu.

## Co jest symulowane / ograniczenia MVP

- **Integracje**: mObywatel, PUE/eZUS, e-ZLA, zaświadczenie o niezaleganiu, USC, wysyłka wniosków i e-maile to **symulacje** (wymóg zadania).
- **Dane rodzin** żyją w przeglądarce (localStorage); nie ma serwerowej bazy użytkowników.
- **Czas rozpatrywania** jest szacowany jawnym modelem heurystycznym (w produkcji: model ML na danych historycznych).
- **Skany**: odczyt wymaga klucza AI; bez niego aplikacja informuje o braku warstwy tekstowej.
- **Parametry z panelu admina**: na Vercel nie są trwałe (osobno dla każdej instancji, do restartu).
- **Mapa i katalog organizacji** to dane demonstracyjne, do weryfikacji przez ZUS przed wdrożeniem.
- **Kwoty** są podawane brutto (przed zaliczką PIT).
