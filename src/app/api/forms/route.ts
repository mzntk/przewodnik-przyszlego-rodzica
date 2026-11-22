import { NextResponse, connection } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { OFFICIAL_FIELDS, OFFICIAL_FORMS } from "@/data/official-forms";

/**
 * GET /api/forms – lista wzorów formularzy i przykładów wypełnienia dostępnych w public/formularze.
 * Konwencja nazw: <ID>.pdf (pusty wzór z zus.pl) oraz <ID>-przyklad.pdf (przykład wypełnienia), np. ZAM.pdf, ZAM-przyklad.pdf.
 */
export async function GET() {
  await connection();
  const files = await readdir(path.join(process.cwd(), "public", "formularze")).catch(() => [] as string[]);
  return NextResponse.json({
    files: files.filter((f) => f.toLowerCase().endsWith(".pdf")),
    // oficjalne druki z opisem pól – do wstępnego wypełniania i sprawdzania (POST /api/forms/prefill, /check, /convert)
    official: Object.values(OFFICIAL_FORMS).map((m) => ({ ...m, fields: (OFFICIAL_FIELDS[m.id] ?? []).length })),
  });
}
