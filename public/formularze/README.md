# Druki ZUS i przykłady wypełnienia

Ten folder zawiera edytowalne wersje „Wypełnij i wydrukuj” z zus.pl (pola AcroForm, stan po 24.10.2026).

## Puste druki – wymagane

Aplikacja korzysta z nich w czterech miejscach:
- wpisuje w nie dane użytkownika (*Podgląd wniosku → Pobierz*, `POST /api/forms/prefill`);
- rozpoznaje je po nazwach pól w *Sprawdź dokument* i `POST /api/forms/convert`;
- udostępnia je do pobrania w panelu sprawy;
- używa ich w testach (`tests/forms.test.ts`).

Nazwy plików i opis pól są zdefiniowane w `src/data/official-forms.ts` (`OFFICIAL_FORMS`, `OFFICIAL_FIELDS`).
Zmiana nazwy pliku albo podmiana na inną wersję druku wymaga aktualizacji tego modułu, bo nazwy pól AcroForm muszą się zgadzać.

| Plik | Druk | Kto wypełnia |
|---|---|---|
| `ZAM.pdf` | ZAM – wniosek o zasiłek macierzyński (zastąpił ZUR i ZAO) | ubezpieczony |
| `ZAS-53.pdf` | ZAS-53 – wniosek o zasiłek chorobowy | ubezpieczony |
| `Z-15.pdf` | Z-15 – wniosek o zasiłek opiekuńczy (zastąpił Z-15A i Z-15B) | ubezpieczony |
| `Z-12.pdf` | Z-12 – wniosek o zasiłek pogrzebowy | ubezpieczony |
| `Z-3.pdf` | Z-3 – zaświadczenie płatnika (pracownik) | płatnik |
| `Z-3a.pdf` | Z-3a – zaświadczenie płatnika (osoba niebędąca pracownikiem) | płatnik |
| `NFZ-ZGLOSZENIE.pdf` | ZUS ZCNA – zgłoszenie dziecka do ubezpieczenia zdrowotnego (plik `ZUS-ZCNA.pdf` z zus.pl pod tą nazwą) | płatnik |
| `ZUS-ZUA.pdf` | ZUS ZUA – zgłoszenie do ubezpieczeń / zmiana danych | płatnik |

## Przykłady wypełnienia – opcjonalne

Jeśli w folderze jest plik `<id sprawy>-przyklad.pdf`, panel sprawy (*Jak załatwić → Wzór druku*) pokazuje przycisk
„Przykład wypełnienia”. Lista plików jest pobierana z `GET /api/forms`.

Nazwa pochodzi od **identyfikatora sprawy** z `src/data/documents.ts`, a nie od kodu druku. Przykład działa tylko dla spraw,
które mają oficjalny druk:

| Plik przykładu | Sprawa |
|---|---|
| `ZAM-przyklad.pdf` | ZAM (mama) |
| `ZAM-TATA-przyklad.pdf` | ZAM (tata) |
| `ZAS-53-przyklad.pdf` | ZAS-53 |
| `Z-15-przyklad.pdf` | Z-15 (zasiłek opiekuńczy) |
| `Z-12-przyklad.pdf` | Z-12 |
| `Z-3-przyklad.pdf` | Z-3 |
| `Z-3a-przyklad.pdf` | Z-3a |
| `NFZ-ZGLOSZENIE-przyklad.pdf` | ZUS ZCNA |
| `ZUS-ZUA-przyklad.pdf` | ZUS ZUA |

Wnioski urlopowe do pracodawcy (wzór MRPiPS), sprawy w USC i 800+ nie mają urzędowego druku. Aplikacja generuje dla nich
własny PDF (`src/lib/pdf.ts`), więc pliki w tym folderze nie są dla nich używane.

Przykłady muszą zawierać wyłącznie dane fikcyjne.
