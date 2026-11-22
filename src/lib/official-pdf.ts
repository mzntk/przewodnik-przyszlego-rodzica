/**
 * Wypełnianie i odczyt edytowalnych druków ZUS (AcroForm) – pdf-lib.
 * Działa w przeglądarce (potok 1: pobierz wypełniony druk) i na serwerze (potok 2: odczyt wgranego druku).
 */
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { fieldKey, type FieldValue } from "@/data/official-forms";

/** Wpisuje wartości w pola druku (wielkie litery jak wymaga ZUS) i generuje wygląd pól polską czcionką. */
export async function fillOfficialPdfBytes(template: ArrayBuffer | Uint8Array, font: ArrayBuffer | Uint8Array, values: Record<string, FieldValue>): Promise<Uint8Array> {
  const doc = await PDFDocument.load(template);
  doc.registerFontkit(fontkit);
  const f = await doc.embedFont(font, { subset: false });
  const form = doc.getForm();
  for (const field of form.getFields()) {
    const key = fieldKey(field.getName());
    if (!(key in values)) continue;
    const v = values[key];
    if (field instanceof PDFTextField) {
      const max = field.getMaxLength();
      const s = String(v);
      field.setText(max ? s.slice(0, max) : s);
    } else if (field instanceof PDFCheckBox) {
      if (v) field.check();
      else field.uncheck();
    }
  }
  form.updateFieldAppearances(f);
  doc.setProducer("Przewodnik Przyszłego Rodzica – wypełnione automatycznie");
  return doc.save();
}

/** Odczyt wartości pól wypełnionego druku: tekst i zaznaczenia. Pusty obiekt, gdy PDF nie ma pól. */
export async function readAcroForm(bytes: Uint8Array): Promise<Record<string, FieldValue>> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const out: Record<string, FieldValue> = {};
    for (const field of doc.getForm().getFields()) {
      const key = fieldKey(field.getName());
      if (field instanceof PDFTextField) {
        const t = field.getText()?.trim();
        if (t) out[key] = t;
        else if (!(key in out)) out[key] = "";
      } else if (field instanceof PDFCheckBox) out[key] = field.isChecked() || out[key] === true;
      else if (field instanceof PDFDropdown) out[key] = field.getSelected().join(", ");
      else if (field instanceof PDFRadioGroup) out[key] = field.getSelected() ?? "";
    }
    return out;
  } catch {
    return {};
  }
}

let fontCache: ArrayBuffer | null = null;
/** Przeglądarka: pobiera wzór z /public/formularze i wypełnia go. */
export async function fillOfficialPdf(file: string, values: Record<string, FieldValue>): Promise<Uint8Array> {
  const [tpl, font] = await Promise.all([fetch(`/formularze/${file}`).then((r) => r.arrayBuffer()), fontCache ? Promise.resolve(fontCache) : fetch("/fonts/Lato_400Regular.ttf").then((r) => r.arrayBuffer())]);
  fontCache = font;
  return fillOfficialPdfBytes(tpl, font, values);
}
