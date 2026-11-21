import { NextResponse, connection } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * GET /api/forms – lista wzorów formularzy i przykładów wypełnienia dostępnych w public/formularze.
 * Konwencja nazw: <ID>.pdf (pusty wzór z zus.pl) oraz <ID>-przyklad.pdf (przykład wypełnienia), np. ZAM.pdf, ZAM-przyklad.pdf.
 */
export async function GET() {
  await connection();
  const files = await readdir(path.join(process.cwd(), "public", "formularze")).catch(() => [] as string[]);
  return NextResponse.json({ files: files.filter((f) => f.toLowerCase().endsWith(".pdf")) });
}
