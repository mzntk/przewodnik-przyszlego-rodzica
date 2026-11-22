# Wzory formularzy ZUS i przykłady wypełnienia

Wrzuć tu pliki PDF pobrane ze strony zus.pl. Aplikacja sama je wykryje i pokaże przy właściwej sprawie.

Nazwy plików (dokładnie tak):

| Plik pustego wzoru | Przykład wypełnienia | Druk |
|---|---|---|
| ZAM.pdf | ZAM-przyklad.pdf | Wniosek o zasiłek macierzyński (zastępuje ZUR i ZAO) |
| Z-3.pdf | Z-3-przyklad.pdf | Zaświadczenie płatnika – pracownik |
| Z-3a.pdf | Z-3a-przyklad.pdf | Zaświadczenie płatnika – zleceniobiorca / inny niż pracownik |
| ZAS-53.pdf | ZAS-53-przyklad.pdf | Wniosek o zasiłek chorobowy (przedsiębiorca) |
| Z-15.pdf | Z-15-przyklad.pdf | Wniosek o zasiłek opiekuńczy (od 24.10.2026 zastępuje Z-15A i Z-15B) |
| Z-12.pdf | Z-12-przyklad.pdf | Wniosek o zasiłek pogrzebowy |
| ZUS-ZUA.pdf | ZUS-ZUA-przyklad.pdf | Zgłoszenie do ubezpieczeń (ZUA) |
| NFZ-ZGLOSZENIE.pdf | NFZ-ZGLOSZENIE-przyklad.pdf | ZUS ZCNA – zgłoszenie dziecka do ubezpieczenia zdrowotnego (plik ZUS-ZCNA.pdf z zus.pl pod tą nazwą) |
| URLOP-RODZ.pdf | URLOP-RODZ-przyklad.pdf | Wniosek o urlop rodzicielski (wzór MRPiPS) |
| URLOP-OJC.pdf | URLOP-OJC-przyklad.pdf | Wniosek o urlop ojcowski |

Wszystkie pliki to edytowalne wersje „Wypełnij i wydrukuj” z zus.pl (pola AcroForm). Aplikacja wpisuje w nie dane (src/data/official-forms.ts) i odczytuje je z wgranych druków (porównanie z danymi i kontrola wykluczających się zaznaczeń).
