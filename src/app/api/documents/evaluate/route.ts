import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig } from "@/services/config/store";
import { ExtractedDocumentSchema, type CaseEvaluation } from "@/models/document";
import { mergeDocuments } from "@/services/documents/merge";
import { evaluateDocument } from "@/services/documents/evaluate";

const Body = z.union([
  z.object({ documents: z.array(ExtractedDocumentSchema).min(1).max(12) }),
  z.object({ document: ExtractedDocumentSchema, fieldFrom: z.record(z.string(), z.number()).optional() }),
]);

/**
 * POST /api/documents/evaluate – ocena całej sprawy bez ponownego wysyłania plików.
 *  { documents: [...] } – scala teczkę dokumentów (ZAM + Z-3 + poświadczenie…) i liczy werdykt,
 *  { document }        – przelicza po ręcznej korekcie odczytanych pól.
 * Odpowiedź: scalone dane, źródło każdego pola, braki spójności, werdykt i podstawa krok po kroku. Bez AI.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane dokumentów" }, { status: 400 });
  const cfg = await getConfig();
  const asOf = new Date().toISOString().slice(0, 10);
  const merged = "documents" in parsed.data ? mergeDocuments(parsed.data.documents) : { document: parsed.data.document, fieldFrom: parsed.data.fieldFrom ?? {}, issues: [] };
  const ev = evaluateDocument(merged.document, cfg, asOf);
  const out: CaseEvaluation = { ...ev, fieldFrom: merged.fieldFrom, issues: merged.issues };
  return NextResponse.json(out);
}
