# Przewodnik Przyszłego Rodzica · ZUS 2026

MVP aplikacji webowej (RWD) na HackNation 2026 – wyzwanie Zakładu Ubezpieczeń Społecznych.
Przeprowadza osoby planujące rodzicielstwo, kobiety w ciąży, rodziców biologicznych, adopcyjnych i rodziny zastępcze
przez ustalenie uprawnień, wybór najkorzystniejszego wariantu zasiłku i złożenie kompletnych wniosków we właściwym miejscu.

Stan prawny: po 24.10.2026 r. (druki **ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15A, Z-15B, Z-12**; ZUR, ZAO i Z-3b zlikwidowane).

## Demo online

**https://przewodnik-przyszlego-rodzica.vercel.app**

Logowanie: wybierz rolę (Mama lub Tata / Partner) → „Zaloguj przez mObywatel” (symulacja) → profil testowy. Przykładowe dokumenty PDF do sprawdzenia: menu „Sprawdź dokument”. Panel parametrów: link „Wejście dla administratora ZUS” na ekranie logowania.

## Uruchomienie

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # testy silnika (15 reguł prawnych)
npm run samples      # (opcjonalnie) ponowne wygenerowanie przykładowych PDF
npm run build && npm start
```

Opcjonalnie – funkcje AI (Claude). Bez klucza aplikacja działa w pełni, AI zastępuje parser regułowy / baza wiedzy:

```bash
cp .env.example .env.local   # ustaw ANTHROPIC_API_KEY
```

## Przepływ i nawigacja

1. **`/` – logowanie** (bez menu): logo ZUS, wybór roli **Mama** lub **Tata / Partner**, symulowane „Zaloguj przez mObywatel”, dyskretne wejście administratora. Link zaproszenia (`/?zaproszenie=KOD`) od razu wybiera rolę partnera.
2. **`/start` – kreator profilu Mamy** (pierwsze logowanie): termin porodu → sytuacja ubezpieczeniowa → drugi rodzic (krok **opcjonalny**, „Pominę – dodam później”) → okoliczności szczególne. W tle pasek synchronizacji z PUE/eZUS.
3. **Aplikacja** – proste etykiety menu:

| Sekcja | Ekran | Ścieżka |
|---|---|---|
| — | **Start** – „Na teraz” (od najpilniejszych; sprawy już złożone znikają) + „Moje sprawy w ZUS” ze statusami + tracker ciąży; karta „Dodaj partnera”, jeśli go brak | `/panel` |
| — | **Moja ciąża** – kalendarz (termin porodu, okna badań, wizyty, terminy ZUS/USC), dziennik nastroju i objawów, karta tygodnia, torba i wyprawka, poradniki (połóg na początku), raport PDF dla lekarza | `/ciaza` |
| Pieniądze i formalności | **Moje sprawy** – wnioski i dokumenty pogrupowane: Do zrobienia / W toku / Załatwione | `/wnioski` |
| | **Ile i kiedy dostanę** – oś czasu świadczeń, alerty, terminy | `/swiadczenia` |
| | **Policz zasiłek** – kalkulator (7 zakładek) | `/kalkulator` |
| | **Sprawdź dokument** – walidator PDF i sprawy testowe | `/dokumenty` |
| Pomoc | **Pomoc i telefony** · **Gdzie to załatwić** (mapa) · **Ustawienia** (profil, dane z ZUS, partner, powiadomienia) | `/wsparcie`, `/placowki`, `/ustawienia` |

**Konto Taty / Partnera** – osobne logowanie. Widzi tylko sekcje włączone przez Mamę w *Ustawienia → Partner*. Partnera można dodać w każdej chwili (pulpit lub ustawienia) i wygenerować kod/link zaproszenia.

**Administrator ZUS** – parametry legislacyjne (`/admin`), kalkulator i walidator PDF.

## Sprawy, statusy i powiadomienia

- **Brak ręcznego odhaczania dokumentów urzędowych.** Każda sprawa ma status nadawany przez system (symulacja synchronizacji z ZUS co 10 s, `src/services/case-sync.ts`): *Niezłożony → Wysłany / zarejestrowany → W trakcie weryfikacji → Przyznany* albo *Wymaga uzupełnienia*. Tempo demonstracyjne jest przyspieszone (15 s / 45 s).
- **Panel sprawy** (klik w dowolny wniosek, także z listy „Inne druki” i z wyszukiwarki): status i etapy oraz dwie zakładki:
  *Jak załatwić* (instrukcja, błędy, załączniki, wzór i przykład wypełnienia z `public/formularze`) i *Podgląd wniosku*
  (kartka wypełniona danymi z profilu, edycja każdego pola przed pobraniem PDF). Treści: `src/data/documents.ts`, ikony druków: `src/components/cases/doc-icon.tsx`.
- **Powiadomienia**: dzwonek z licznikiem, krótkie toasty (ok. 2,5–3,5 s), e-mail (wersja webowa, `POST /api/notify/email` – symulacja)
  i push (Notification API w przeglądarce; w aplikacji mobilnej APNs/FCM). Użytkownik wybiera **osobno dla każdego tematu**
  (terminy, statusy, odpowiedzi ZUS, wizyty, tydzień ciąży, ryzyka) i kanału: *Ustawienia → Powiadomienia*.
- **Wiadomości z ZUS**: *Ustawienia → Wiadomości z ZUS*. Odpowiedź (symulowana po ok. 9 s) trafia do tej skrzynki, pod dzwonek i na e-mail.
- **Ikonka ⓘ** przy „trudnych” słowach (`Term`, `src/data/glossary.ts`) i przy polach formularzy (`Field info=…`) – m.in. „skąd wziąć liczbę ubezpieczonych”.
- **Cytaty przepisów**: każde oznaczenie przepisu – etykieta `LegalChip` i odwołanie w tekście (`LegalText`, wykrywane automatycznie w podpowiedziach, podtytułach i opisach) – po najechaniu / dotknięciu pokazuje brzmienie przepisu (jeśli jest w bazie) i link do aktu (`src/data/legal-quotes.ts` – do weryfikacji przez prawnika przed wdrożeniem).
- **Ryzyka dla świadczeń**: *Pieniądze → Centrum alertów → Na co uważać* (`src/data/risks.ts`) – utrata prawa, zmiana wymiaru lub wysokości.
- **Wyszukiwarka** (lupka w nagłówku, Ctrl/⌘+K) i **ZUSia** korzystają z jednego silnika (`src/lib/search.ts`) i jednej bazy treści (`src/data/corpus.ts`: pytania, pojęcia, druki, poradniki, listy, ryzyka, telefony, organizacje, placówki, funkcje aplikacji). Silnik rozumie odmianę („szpitala” = „szpital”), pomija słowa nieistotne, zna synonimy („spakować” → torba) i odrzuca słabe dopasowania – ZUSia mówi wtedy wprost, że nie wie.
- **Partner** dołącza z linku zaproszenia, loguje się własnym mObywatelem (kod QR) i sam uzupełnia swoje dane.

## Maskotka i grafiki

| Plik | Użycie |
|---|---|
| `public/brand/zusia.png` | ZUSia z identyfikatorem – awatar czatu |
| `public/brand/zusia-pakunek.png` | ZUSia z pakunkiem ZUS – ekran logowania; źródło favicony `src/app/icon.png` |
| `public/brand/zusia-lot.png`, `zusia-lot.gif` | ZUSia w locie – ekran błędu |
| `public/brand/logo-aplikacji.png` | Logo aplikacji (1:1) – nagłówek, menu, `src/app/apple-icon.png` |

Logo zawsze renderujemy z zablokowanymi proporcjami (`aspect-square` + `object-contain`; logo ZUS: `h-* w-auto`).

## Wzory formularzy

PDF-y ze strony zus.pl wrzucamy do `public/formularze` (nazwy w `public/formularze/README.md`). API `GET /api/forms`
wykrywa je automatycznie, a panel sprawy pokazuje przyciski „Pusty wzór” i „Przykład wypełnienia”.

## Potok analizy dokumentu (tylko dokumentacja – usunięty z UI)

1. **Ekstrakcja tekstu** (`unpdf`); PDF bez warstwy tekstowej = skan.
2. **Pseudonimizacja** (`src/services/ai/privacy.ts`): PESEL, NIP, nr rachunku, e-mail, telefon, seria dowodu, nazwiska i adresy z etykiet → tokeny `[PESEL_1]`…
3. **Mapowanie do JSON** – parser regułowy + opcjonalnie AI (Structured Output); tokeny odtwarzane po stronie serwera.
4. **Walidacja formalna** (Zał. 1–7 rozporządzenia).
5. **Silnik uprawnień i kalkulator** – deterministyczny werdykt.

## Wygląd

Jasny motyw (białe tło, karty w delikatnej szarości, jedno obramowanie bez cieni), czcionka **Lato** z fallbackiem Helvetica, akcent w zieleni R51 G118 B60 (`#33763C`, zmienna `--brand`), kontrast tekstu ≥ 4.5:1, tekst podstawowy 16 px. Zgodnie z wytycznymi [impeccable](https://github.com/pbakaus/impeccable): bez gradientów, rozmyć, emoji w roli ikon i zagnieżdżonych kart; ruch krótki (ease-out) z obsługą `prefers-reduced-motion`.

## Architektura

```
src/
├── models/            # typy i schematy (LegalConfig, CaseInput, CalculationResult, ExtractedDocument – zod)
├── services/
│   ├── engine/        # DETERMINISTYCZNY silnik uprawnień i kalkulator (zero AI)
│   │   ├── base.ts          # podstawa wymiaru – art. 36–49 (w tym 48a)
│   │   ├── eligibility.ts   # tytuł ubezpieczenia, wyczekiwanie (art. 4), zadłużenie (art. 2a), płatnik (art. 61)
│   │   ├── sickness.ts      # chorobowy w ciąży, 33/14 dni, 270 dni, kod B, rehabilitacyjne
│   │   ├── maternity.ts     # macierzyński, uzupełniający, rodzicielski, łączenie z pracą, ojcowski, adopcja, 81,5%
│   │   ├── deadlines.ts     # terminy graniczne
│   │   ├── family.ts        # 800+, becikowe, Aktywny Rodzic, świadczenie rodzicielskie
│   │   └── index.ts         # calculate() + Red Flags
│   ├── documents/     # ekstrakcja PDF (unpdf), parser regułowy, walidator Zał. 1–7, PESEL/NIP/REGON
│   ├── ai/            # ⚡ funkcje wspierane przez AI (wyraźnie oddzielone)
│   ├── config/        # magazyn konfiguracji legislacyjnej (panel admina)
│   └── integrations.ts# symulacje mObywatel / PUE / e-ZLA / USC / wysyłki
├── app/api/           # REST API (route handlers)
├── app/*              # ekrany (logowanie, kreator, pulpit, ciąża, zasiłki, wsparcie, admin)
├── components/        # UI (Radix, Vaul, Sonner, Framer Motion, Tailwind)
└── data/              # profile testowe, sprawy PDF, baza wiedzy, katalog wsparcia, mapa, edukacja
tests/engine.test.ts   # testy reguł prawnych
public/samples/*.pdf   # zanonimizowane (fikcyjne) dokumenty testowe
```

**Backend:** zgodnie z dopuszczoną elastycznością backend zrealizowano w TypeScript (Next.js Route Handlers – REST API),
by dostarczyć jedno spójne, łatwe do wdrożenia MVP (Azure App Service / Container Apps). Silnik jest czystym modułem TS –
gotowy do przeniesienia do osobnej usługi. Konfiguracja: plik JSON (`.data/`) – w produkcji tabela PostgreSQL z wersjonowaniem.

### REST API

| Metoda | Endpoint | Opis |
|---|---|---|
| POST | `/api/calculate` | `CaseInput` → `CalculationResult` (deterministycznie) |
| POST | `/api/documents/analyze` | PDF (multipart) lub `{ sampleId }` → ekstrakcja, braki formalne, werdykt |
| GET | `/api/documents/samples` | lista spraw testowych |
| GET / PATCH | `/api/config` | parametry legislacyjne (PATCH: nagłówek `x-role: admin`) |
| POST | `/api/config/reset` · GET `/api/config/history` | reset / historia zmian |
| POST | `/api/bot` | ⚡ ZUS-bot |
| GET | `/api/integrations/zus?profile=` | symulacja PUE/eZUS, zaświadczenia o zadłużeniu, e-ZLA |
| POST | `/api/integrations/submit` | symulacja wysyłki wniosku + estymacja czasu |
| POST | `/api/integrations/status` | symulacja pobrania statusów spraw z ZUS |
| GET | `/api/profiles`, `/api/health` | profile testowe, status |

## ⚡ Funkcje wspierane przez AI (wymóg regulaminu)

AI (model Claude, `claude-opus-5-5`) jest używane **wyłącznie** w dwóch miejscach, oznaczonych w UI etykietą „Wspierane przez AI”:

1. **Mapowanie dokumentów (Moduł 4)** – `src/services/ai/extract.ts`: Structured Output do ustandaryzowanego JSON
   oraz odczyt skanów bez warstwy tekstowej (OCR przez model wizyjny). Wynik jest scalany z parserem regułowym
   (identyfikatory z poprawną sumą kontrolną mają pierwszeństwo), a następnie walidowany deterministycznie.
2. **ZUSia (czat)** – `src/services/ai/bot.ts`: odpowiedzi prostym językiem wyłącznie na podstawie bazy wiedzy (streszczenia
   Poradnika ZUS 2026); bez klucza API działa wyszukiwanie regułowe. Włączony server-side fallback przy odmowie modelu.

**Bezpieczeństwo i RODO** (`src/services/ai/privacy.ts`, `src/app/api/bot/route.ts`):
- walidacja wejścia (zod), limit 1000 znaków i 20 zapytań/min na IP, usuwanie znaków niewidocznych;
- wykrywanie prób prompt injection (zmiana roli, ujawnienie instrukcji) → odpowiedź bez wywołania modelu;
- pytanie użytkownika opakowane w `<pytanie_uzytkownika>` i traktowane jako dane; nadrzędne zasady w promptcie systemowym;
- filtr odpowiedzi (tylko linki zus.pl / gov.pl / ISAP, tylko wewnętrzne skróty z białej listy);
- dane osobowe ukrywane przed wysłaniem do modelu; zgoda na AI do wyłączenia w *Ustawienia → Konto*.

**AI nigdy nie liczy kwot ani nie rozstrzyga o uprawnieniach** – robi to `services/engine` (pokryty testami).
Pozostałe funkcje (kalkulator, walidator, routing płatnika, terminy, Centrum alertów, panel admina) są w 100% deterministyczne.

## Profile testowe (3-minutowe demo)

1. **Anna** – UoP w małej firmie (12 os. → ZUS), L4 z kodem B (reset 270 dni), łączenie rodzicielskiego z pracą na 1/2 etatu.
2. **Magdalena** – JDG od 6 mies. (art. 48a), zaległość 312,45 zł > 48,06 zł → blokada art. 2a.
3. **Karolina i Tomasz** – bliźnięta z 27. tyg. (940 g), 52 dni szpitala → uzupełniający 8 tyg., wariant 81,5%, podział urlopu.
4. **Julia** – studentka < 26 lat na zleceniu → brak ubezpieczenia → świadczenie rodzicielskie.
5. **Ewa i Marek** – adopcja 3-latka, zlecenie z dobrowolnym chorobowym, płatnik > 20 os.

Sprawy PDF w `public/samples` (dane fikcyjne, sumy kontrolne PESEL/NIP poprawne – poza celowo błędnym dokumentem).

## Materiały konkursowe

Folder `wytyczne/materialy` zawiera materiały przekazane przez ZUS: pełną treść zadania i regulamin, wyciągi z Kodeksu pracy
i ustawy zasiłkowej, rozporządzenia, Poradnik dla rodziców 2026 i załącznik z wymiarem zasiłków. Cytaty przepisów w aplikacji
(`src/data/legal-quotes.ts`) dla KP i ustawy zasiłkowej są zgodne z tymi wyciągami (Dz.U. z 2026 r.).

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
| pdf-lib, @pdf-lib/fontkit | generowanie wypełnionych wniosków PDF | MIT |
| unpdf (pdf.js) | odczyt tekstu z PDF | MIT / Apache-2.0 |
| Lato (Fontsource) | krój pisma | OFL |
| Claude API (Anthropic, `@anthropic-ai/sdk`) | funkcje AI: mapowanie dokumentów, czat ZUSi | usługa komercyjna |
| Google Maps (link „Wyznacz trasę”) | nawigacja do placówki (link zewnętrzny) | – |

Maskotka ZUSia i logo aplikacji – materiały graficzne zespołu.

## Hierarchia źródeł

Pełna treść zadania ZUS → Załącznik (wymiary/stawki 2026) → ustawa zasiłkowa → Kodeks pracy → rozp. z 27.09.2026 (Zał. 1–7, § 13 ust. 2)
→ rozp. z 11.03.2025 (wnioski urlopowe) → Poradnik ZUS 2026. Każdy wynik silnika niesie cytowanie podstawy prawnej.

## Co jest symulowane / ograniczenia MVP

- mObywatel, PUE/eZUS, e-ZLA, zaświadczenie o niezaleganiu, USC i wysyłka wniosków – **symulacje** (wymóg zadania).
- Estymacja czasu rozpatrywania – jawny model heurystyczny (w produkcji: model ML na danych historycznych).
- OCR skanów wymaga klucza AI; bez niego aplikacja informuje o braku warstwy tekstowej.
- Mapa i katalog organizacji – dane demonstracyjne do weryfikacji przez ZUS przed wdrożeniem.
- Kwoty brutto (przed zaliczką PIT).
