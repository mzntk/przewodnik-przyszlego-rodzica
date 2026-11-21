/**
 * Generuje zanonimizowane przykładowe dokumenty PDF (dane fikcyjne) do /public/samples.
 * Uruchom: npm run samples
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), "public", "samples");
const FONT_R = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Lato_400Regular.ttf"));
const FONT_B = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Lato_700Bold.ttf"));

type Block =
  | { h: string }
  | { kv: [string, string][] }
  | { table: { head: string[]; rows: string[][] } }
  | { p: string }
  | { sign: { place: string; date: string; signed: boolean; name: string } };

async function makePdf(file: string, code: string, title: string, subtitle: string, blocks: Block[]) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const R = await doc.embedFont(FONT_R, { subset: true });
  const B = await doc.embedFont(FONT_B, { subset: true });
  doc.setTitle(`${code} – ${title}`);
  doc.setAuthor("Zasiłkowy Przewodnik – dane testowe (fikcyjne)");
  let page = doc.addPage([595, 842]);
  let y = 800;
  const ink = rgb(0.1, 0.12, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const line = rgb(0.82, 0.84, 0.87);
  const ensure = (h: number) => {
    if (y - h < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
  };
  const text = (p: PDFPage, s: string, x: number, yy: number, f: PDFFont, size: number, color = ink) => p.drawText(s, { x, y: yy, font: f, size, color });

  // nagłówek
  page.drawRectangle({ x: 40, y: 770, width: 515, height: 46, color: rgb(0.0, 0.33, 0.62) });
  text(page, code, 52, 795, B, 18, rgb(1, 1, 1));
  text(page, title, 52, 779, R, 9.5, rgb(0.9, 0.95, 1));
  text(page, "ZAKŁAD UBEZPIECZEŃ SPOŁECZNYCH", 360, 795, B, 9, rgb(1, 1, 1));
  text(page, "DANE TESTOWE – FIKCYJNE", 360, 781, R, 8, rgb(0.9, 0.95, 1));
  y = 750;
  text(page, subtitle, 40, y, R, 9, muted);
  y -= 22;

  for (const b of blocks) {
    if ("h" in b) {
      ensure(30);
      y -= 6;
      text(page, b.h.toUpperCase(), 40, y, B, 9.5, rgb(0.0, 0.33, 0.62));
      y -= 6;
      page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.6, color: line });
      y -= 14;
    } else if ("kv" in b) {
      for (const [k, v] of b.kv) {
        ensure(16);
        text(page, `${k}:`, 48, y, R, 9, muted);
        text(page, v, 230, y, B, 9.5);
        y -= 15;
      }
      y -= 4;
    } else if ("table" in b) {
      const cols = b.table.head.length;
      const w = 507 / cols;
      ensure(20);
      b.table.head.forEach((hd, i) => text(page, hd, 48 + i * w, y, B, 8.5, muted));
      y -= 14;
      for (const r of b.table.rows) {
        ensure(14);
        r.forEach((c, i) => text(page, c, 48 + i * w, y, R, 9));
        y -= 13;
      }
      y -= 6;
    } else if ("p" in b) {
      const words = b.p.split(" ");
      let lineStr = "";
      for (const w of words) {
        const test = lineStr ? `${lineStr} ${w}` : w;
        if (R.widthOfTextAtSize(test, 9) > 500) {
          ensure(14);
          text(page, lineStr, 48, y, R, 9);
          y -= 13;
          lineStr = w;
        } else lineStr = test;
      }
      if (lineStr) {
        ensure(14);
        text(page, lineStr, 48, y, R, 9);
        y -= 13;
      }
      y -= 6;
    } else if ("sign" in b) {
      ensure(70);
      y -= 10;
      text(page, `Miejscowość i data: ${b.sign.place}, ${b.sign.date}`, 48, y, R, 9);
      y -= 30;
      if (b.sign.signed) {
        text(page, b.sign.name, 360, y + 8, B, 11, rgb(0.05, 0.2, 0.55));
        text(page, "/podpisano elektronicznie – profil zaufany/", 330, y - 4, R, 7.5, muted);
      } else {
        text(page, "______________________________", 340, y + 4, R, 9, muted);
      }
      y -= 16;
      text(page, "(podpis)", 410, y, R, 8, muted);
      y -= 20;
    }
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Strona ${i + 1}/${pages.length} · dokument wygenerowany do celów demonstracyjnych HackNation 2026`, { x: 40, y: 30, size: 7, font: R, color: muted }));
  fs.writeFileSync(path.join(OUT, file), await doc.save());
  console.log("✓", file);
}

function months(last: string, n: number, gross: string, overrides: Record<string, [string, string]> = {}) {
  const [y, m] = last.split("-").map(Number);
  const rows: string[][] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const key = d.toISOString().slice(0, 7);
    const o = overrides[key];
    rows.push([key, `${o?.[0] ?? gross} zł`, o?.[1] ?? "21/21"]);
  }
  return rows;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  await makePdf("ZAM_Kowalczyk_Anna.pdf", "ZAM", "Wniosek o zasiłek macierzyński", "Wniosek o zasiłek macierzyński za okres urlopu macierzyńskiego / rodzicielskiego / ojcowskiego", [
    { h: "Dane ubezpieczonej" },
    { kv: [["Imię", "Anna"], ["Nazwisko", "Kowalczyk"], ["PESEL", "92071808463"], ["Adres zamieszkania", "ul. Lipowa 14/3, 00-175 Warszawa"]] },
    { h: "Dane płatnika składek" },
    { kv: [["Nazwa płatnika", "Biuro Rachunkowe Bilans Sp. z o.o."], ["NIP", "676-248-12-31"], ["REGON", "123456785"], ["Tytuł ubezpieczenia", "umowa o pracę – pełny wymiar"], ["Liczba ubezpieczonych zgłoszonych do ubezpieczenia chorobowego", "12"]] },
    { h: "Dane dziecka i świadczenia" },
    { kv: [["Rodzaj świadczenia", "macierzyński za okres urlopu macierzyńskiego"], ["Przewidywana data porodu", "15.01.2027"], ["Liczba dzieci urodzonych przy jednym porodzie", "1"], ["Zaświadczenie „Za życiem”", "NIE"], ["Wniosek o 81,5% (art. 30a)", "nie dotyczy"]] },
    { h: "Wypłata" },
    { kv: [["Nr rachunku bankowego", "PL 61 1090 1014 0000 0712 1981 2874"]] },
    { sign: { place: "Warszawa", date: "18.11.2026", signed: true, name: "Anna Kowalczyk" } },
  ]);

  await makePdf("Z-3_Kowalczyk_Anna.pdf", "Z-3", "Zaświadczenie płatnika składek", "Dla celów ustalenia prawa do zasiłku i jego wysokości – ubezpieczony będący pracownikiem", [
    { h: "Płatnik składek" },
    { kv: [["Nazwa płatnika", "Biuro Rachunkowe Bilans Sp. z o.o."], ["NIP", "6762481231"], ["REGON", "123456785"], ["Liczba ubezpieczonych zgłaszanych do ubezpieczenia chorobowego", "12"]] },
    { h: "Ubezpieczony" },
    { kv: [["Imię", "Anna"], ["Nazwisko", "Kowalczyk"], ["PESEL", "92071808463"], ["Okres zatrudnienia", "zatrudniona od 01.03.2021 – umowa o pracę na czas nieokreślony"], ["Wymiar czasu pracy", "1/1"]] },
    { h: "Zaświadczenie lekarskie" },
    { kv: [["e-ZLA seria i nr", "ZX 1048821 od 13.10.2026 do 31.12.2026 kod B (ciąża)"]] },
    { h: "Wynagrodzenie (miesiąc · kwota brutto · dni przepracowane/obowiązujące)" },
    { table: { head: ["Miesiąc", "Wynagrodzenie", "Dni"], rows: months("2026-08", 12, "7 800,00", { "2026-03": ["5 200,00", "14/22"], "2026-06": ["2 900,00", "8/21"] }) } },
    { p: "Składniki kwartalne: premia kwartalna za 4 poprzednie kwartały łącznie 3 600,00 zł. Procent potrąconej składki: 13,71%." },
    { sign: { place: "Warszawa", date: "20.11.2026", signed: true, name: "Halina Wójcik" } },
  ]);

  await makePdf("Poswiadczenie_Wisniewska_Magdalena.pdf", "POŚWIADCZENIE", "Poświadczenie ubezpieczenia chorobowego", "Dokument wewnętrzny ZUS – tytuł, okresy podlegania i podstawa wymiaru składek", [
    { h: "Ubezpieczona" },
    { kv: [["Imię", "Magdalena"], ["Nazwisko", "Wiśniewska"], ["PESEL", "95112203289"]] },
    { h: "Tytuł ubezpieczenia" },
    { kv: [["Tytuł", "pozarolnicza działalność gospodarcza (pełne składki)"], ["Ubezpieczenie chorobowe dobrowolne", "TAK – podlega od 01.05.2026"], ["NIP płatnika", "9452197744"]] },
    { h: "Zadeklarowana podstawa wymiaru składek na ubezpieczenie chorobowe" },
    { table: { head: ["Miesiąc", "Podstawa", "Uwagi"], rows: months("2026-12", 8, "9 000,00").map((r) => [r[0], r[1], "opłacono"]) } },
    { h: "Stan rozliczeń" },
    { kv: [["Zadłużenie z tytułu składek na dzień 20.11.2026", "312,45 zł"], ["Próg art. 2a (1% płacy minimalnej)", "48,06 zł"]] },
    { p: "Przewidywana data porodu: 30.01.2027. Uwaga: prawo do zasiłków przysługuje po spłacie całości zadłużenia." },
  ]);

  await makePdf("ZAS-53_Wisniewska_Magdalena.pdf", "ZAS-53", "Wniosek o zasiłek chorobowy", "Dla osoby prowadzącej pozarolniczą działalność", [
    { h: "Dane wnioskodawcy" },
    { kv: [["Imię", "Magdalena"], ["Nazwisko", "Wiśniewska"], ["PESEL", "95112203289"], ["Adres zamieszkania", "ul. Długa 7, 31-147 Kraków"], ["Tytuł", "pozarolnicza działalność gospodarcza"], ["Dobrowolne ubezpieczenie chorobowe", "TAK od 01.05.2026"]] },
    { h: "Okres niezdolności do pracy" },
    { kv: [["e-ZLA seria i nr", "ZX 2290017 od 03.08.2026 do 21.08.2026 kod B ciąża"]] },
    { h: "Podstawa wymiaru składek na ubezpieczenie chorobowe" },
    { table: { head: ["Miesiąc", "Zadeklarowana podstawa", "Dni"], rows: months("2026-07", 3, "9 000,00").map((r) => [r[0], r[1], "-"]) } },
    { kv: [["Nr rachunku bankowego", "PL 27 1140 2004 0000 3502 7712 9093"]] },
    { sign: { place: "Kraków", date: "24.08.2026", signed: true, name: "Magdalena Wiśniewska" } },
  ]);

  await makePdf("ZAM_Nowak_Karolina.pdf", "ZAM", "Wniosek o zasiłek macierzyński", "Wniosek o zasiłek macierzyński – urlop macierzyński, uzupełniający i rodzicielski", [
    { h: "Dane ubezpieczonej" },
    { kv: [["Imię", "Karolina"], ["Nazwisko", "Nowak"], ["PESEL", "90042507142"], ["Adres zamieszkania", "ul. Słoneczna 2, 60-101 Poznań"], ["Tytuł ubezpieczenia", "umowa o pracę"]] },
    { h: "Płatnik" },
    { kv: [["Nazwa płatnika", "Medisoft Technologies S.A."], ["NIP", "5213692579"], ["Liczba ubezpieczonych", "450"]] },
    { h: "Dziecko" },
    { kv: [["Data urodzenia dziecka", "28.10.2026"], ["Liczba dzieci urodzonych przy jednym porodzie", "2"], ["Tydzień ciąży", "27"], ["Masa urodzeniowa", "940 g (najniższa)"], ["Pobyt dziecka w szpitalu", "52 dni"], ["Zaświadczenie „Za życiem”", "NIE"]] },
    { h: "Wariant wypłaty" },
    { p: "[x] Wnioskuję o 81,5% podstawy wymiaru za cały okres urlopu macierzyńskiego i rodzicielskiego (art. 30a ustawy zasiłkowej) – wniosek złożony w terminie 21 dni od porodu." },
    { kv: [["Rodzaj świadczenia", "macierzyński + uzupełniający + rodzicielski"], ["Nr rachunku bankowego", "PL 83 1020 4027 0000 1102 0981 4517"]] },
    { h: "Wynagrodzenie z 12 miesięcy" },
    { table: { head: ["Miesiąc", "Wynagrodzenie", "Dni"], rows: months("2026-07", 12, "11 400,00") } },
    { sign: { place: "Poznań", date: "10.11.2026", signed: true, name: "Karolina Nowak" } },
  ]);

  await makePdf("Z-3a_Lis_Ewa.pdf", "Z-3a", "Zaświadczenie płatnika składek", "Dla ubezpieczonego niebędącego pracownikiem – umowa zlecenia", [
    { h: "Płatnik składek" },
    { kv: [["Nazwa płatnika", "Fundacja Edukacja Bez Granic"], ["NIP", "8992734412"], ["REGON", "123456785"], ["Liczba ubezpieczonych zgłaszanych do ubezpieczenia chorobowego", "27"]] },
    { h: "Ubezpieczony" },
    { kv: [["Imię", "Ewa"], ["Nazwisko", "Lis"], ["PESEL", "87060912340"], ["Tytuł", "umowa zlecenia"], ["Dobrowolne ubezpieczenie chorobowe", "TAK od 01.02.2023"]] },
    { h: "Przychód stanowiący podstawę wymiaru składek" },
    { table: { head: ["Miesiąc", "Przychód", "Dni"], rows: months("2026-11", 12, "6 200,00") } },
    { p: "Wniosek dotyczy przyjęcia dziecka na wychowanie i wystąpienia do sądu opiekuńczego o przysposobienie. Data przyjęcia dziecka: 01.12.2026." },
    { sign: { place: "Gdańsk", date: "02.12.2026", signed: true, name: "Tomasz Bielecki" } },
  ]);

  await makePdf("ZAM_Zielinska_Julia_braki.pdf", "ZAM", "Wniosek o zasiłek macierzyński", "Wniosek o zasiłek macierzyński", [
    { h: "Dane ubezpieczonej" },
    { kv: [["Imię", "Julia"], ["Nazwisko", "Zielińska"], ["PESEL", "04251707646"], ["Adres zamieszkania", "ul. Akademicka 5/12, 50-001 Wrocław"]] },
    { h: "Tytuł" },
    { p: "Umowa zlecenia – Kawiarnia Ziarno s.c. Zleceniobiorca jest studentem do ukończenia 26 lat – nie podlega ubezpieczeniom społecznym, w tym chorobowemu." },
    { h: "Dziecko" },
    { kv: [["Przewidywana data porodu", "10.03.2027"], ["Liczba dzieci urodzonych przy jednym porodzie", "1"]] },
    { kv: [["Nr rachunku bankowego", "—"]] },
    { sign: { place: "Wrocław", date: "", signed: false, name: "" } },
  ]);

  await makePdf("Zrzut_systemu_Mazur_Ola.pdf", "ZRZUT SYSTEMU", "Zrzut z systemu wewnętrznego ZUS – okresy ubezpieczenia", "Ekran: Konto ubezpieczonego › Okresy podlegania › Zasiłki", [
    { kv: [["Imię", "Aleksandra"], ["Nazwisko", "Mazur"], ["PESEL", "96030411282"]] },
    { h: "Okresy podlegania" },
    { table: { head: ["Tytuł", "Od", "Do"], rows: [["umowa zlecenia (dobrowolne chorobowe: TAK)", "01.02.2025", "30.11.2026"]] } },
    { p: "Ubezpieczenie chorobowe: dobrowolne TAK od 01.02.2025. Ubezpieczenie ustało: zatrudnienie do 30.11.2026 (rozwiązanie umowy zlecenia)." },
    { kv: [["Przewidywana data porodu", "14.02.2027"], ["Status", "brak tytułu do ubezpieczenia chorobowego w dniu porodu – zasiłek macierzyński nie przysługuje"]] },
    { table: { head: ["Miesiąc", "Przychód", "Dni"], rows: months("2026-11", 12, "4 300,00") } },
  ]);

  await makePdf("Z-3_bledne_dane.pdf", "Z-3", "Zaświadczenie płatnika składek", "Dla celów ustalenia prawa do zasiłku – pracownik", [
    { h: "Płatnik składek" },
    { kv: [["Nazwa płatnika", "Kaczmarek Transport"], ["NIP", "1234567890"]] },
    { h: "Ubezpieczony" },
    { kv: [["Imię", "Robert"], ["Nazwisko", "Kaczmarek"], ["PESEL", "85010112346"], ["Okres zatrudnienia", "zatrudniony od 01.06.2024"]] },
    { h: "Wynagrodzenie" },
    { table: { head: ["Miesiąc", "Wynagrodzenie", "Dni"], rows: months("2026-10", 6, "6 100,00").map((r) => [r[0], r[1], ""]) } },
    { p: "Rodzaj świadczenia: urlop ojcowski. Data urodzenia dziecka: 05.11.2026." },
    { sign: { place: "Łódź", date: "12.11.2026", signed: false, name: "" } },
  ]);
}

main();
