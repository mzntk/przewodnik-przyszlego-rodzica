import { NextResponse } from "next/server";
import { pdfToJson } from "@/services/forms/convert";
import { checkForm } from "@/services/forms/check";

/**
 * POST /api/forms/convert – KONWERTER PDF → JSON (multipart/form-data: file=<edytowalny druk ZUS>).
 * Zwraca: rozpoznany druk, pola z etykietami i wartościami, ustandaryzowany dokument oraz wynik formuł sprawdzania.
 * Plik jest przetwarzany w pamięci i nie jest zapisywany.
 */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Wyślij plik PDF w polu „file”" }, { status: 400 });
  if (file.size > 4.4 * 1024 * 1024) return NextResponse.json({ error: "Plik większy niż 4,4 MB" }, { status: 413 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") return NextResponse.json({ error: "To nie jest plik PDF" }, { status: 415 });
  const json = await pdfToJson(bytes);
  if (!json.form) return NextResponse.json({ ...json, check: null, note: "Nie rozpoznano edytowalnego druku ZUS (brak pól formularza). Skany i druki papierowe analizuje /api/documents/analyze." });
  const values = Object.fromEntries([...json.fields.map((f) => [f.name, f.value] as const), ...Object.entries(json.other)]);
  return NextResponse.json({ ...json, check: checkForm(json.form, values, { requireFields: true }) });
}
