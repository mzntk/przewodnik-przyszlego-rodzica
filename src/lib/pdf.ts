"use client";
/** Generowanie PDF wniosków po stronie przeglądarki (pdf-lib + DM Sans z polskimi znakami). */
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export interface PdfForm {
  code: string;
  title: string;
  addressee: string;
  legal: string;
  fields: { label: string; value: string }[];
  attachments: string[];
  statements?: string[];
  signer: string;
  place: string;
  date: string;
}

let fonts: { r: ArrayBuffer; b: ArrayBuffer } | null = null;

export async function buildFormPdf(f: PdfForm): Promise<Uint8Array> {
  if (!fonts) {
    const [r, b] = await Promise.all([fetch("/fonts/Lato_400Regular.ttf").then((x) => x.arrayBuffer()), fetch("/fonts/Lato_700Bold.ttf").then((x) => x.arrayBuffer())]);
    fonts = { r, b };
  }
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const R = await doc.embedFont(fonts.r, { subset: true });
  const B = await doc.embedFont(fonts.b, { subset: true });
  doc.setTitle(`${f.code} – ${f.title}`);
  doc.setCreator("Zasiłkowy Przewodnik Przyszłego Rodzica");
  let page = doc.addPage([595, 842]);
  const ink = rgb(0.08, 0.1, 0.14);
  const muted = rgb(0.42, 0.45, 0.5);
  let y = 800;
  const write = (s: string, x: number, size: number, bold = false, color = ink) => page.drawText(s, { x, y, size, font: bold ? B : R, color });
  const wrap = (s: string, x: number, size: number, width: number, bold = false) => {
    const font = bold ? B : R;
    let line = "";
    for (const w of s.split(" ")) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width) {
        write(line, x, size, bold);
        y -= size + 4;
        line = w;
        if (y < 70) { page = doc.addPage([595, 842]); y = 800; }
      } else line = t;
    }
    if (line) { write(line, x, size, bold); y -= size + 4; }
  };

  write(`${f.place}, dnia ${f.date}`, 400, 9.5);
  y -= 30;
  write(f.signer, 48, 10.5, true);
  y -= 14;
  write("(imię i nazwisko wnioskodawcy)", 48, 8, false, muted);
  y -= 30;
  write(f.addressee, 330, 10.5, true);
  y -= 40;
  page.drawRectangle({ x: 40, y: y - 8, width: 515, height: 34, color: rgb(0.93, 0.95, 0.98) });
  write(f.code, 52, 13, true, rgb(0, 0.3, 0.6));
  y -= 0;
  page.drawText(f.title.toUpperCase(), { x: 52 + B.widthOfTextAtSize(f.code, 13) + 12, y, size: 10.5, font: B, color: ink });
  y -= 30;
  wrap(`Podstawa prawna: ${f.legal}`, 48, 8.5, 500);
  y -= 8;
  for (const fl of f.fields) {
    if (y < 90) { page = doc.addPage([595, 842]); y = 800; }
    write(fl.label, 48, 8.5, false, muted);
    y -= 13;
    wrap(fl.value || "—", 48, 10.5, 500, true);
    y -= 6;
  }
  if (f.statements?.length) {
    y -= 6;
    write("Oświadczenia", 48, 10, true);
    y -= 16;
    for (const s of f.statements) wrap(`– ${s}`, 48, 9.5, 500);
  }
  if (f.attachments.length) {
    y -= 8;
    write("Załączniki", 48, 10, true);
    y -= 16;
    f.attachments.forEach((a, i) => wrap(`${i + 1}. ${a}`, 48, 9.5, 500));
  }
  y -= 40;
  if (y < 90) { page = doc.addPage([595, 842]); y = 760; }
  page.drawLine({ start: { x: 360, y }, end: { x: 545, y }, thickness: 0.6, color: muted });
  y -= 12;
  write("(podpis wnioskodawcy)", 410, 8, false, muted);
  doc.getPages().forEach((p, i, arr) => p.drawText(`Wygenerowano w Zasiłkowym Przewodniku · strona ${i + 1}/${arr.length}`, { x: 40, y: 28, size: 7, font: R, color: muted }));
  return doc.save();
}

export function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
