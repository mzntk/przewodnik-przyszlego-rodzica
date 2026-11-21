import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getConfig } from "@/services/config/store";
import { analyzePdf } from "@/services/documents/analyze";
import { SAMPLE_CASES } from "@/data/samples";
import { aiAvailable } from "@/services/ai/client";

export const maxDuration = 60;

/**
 * POST /api/documents/analyze
 * multipart/form-data: file=<PDF>, ai=1|0   lub   JSON: { sampleId, ai }
 * Zwraca: ekstrakcję, braki formalne, ustandaryzowany JSON i werdykt silnika.
 */
export async function POST(req: Request) {
  const cfg = await getConfig();
  const asOf = new Date().toISOString().slice(0, 10);
  try {
    let bytes: Uint8Array;
    let name: string;
    let useAi = aiAvailable();
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Brak pliku PDF" }, { status: 400 });
      if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Plik większy niż 15 MB" }, { status: 413 });
      bytes = new Uint8Array(await file.arrayBuffer());
      name = file.name;
      useAi = useAi && form.get("ai") !== "0";
    } else {
      const body = (await req.json()) as { sampleId?: string; ai?: boolean };
      const sample = SAMPLE_CASES.find((s) => s.id === body.sampleId);
      if (!sample) return NextResponse.json({ error: "Nieznana sprawa testowa" }, { status: 404 });
      bytes = new Uint8Array(await fs.readFile(path.join(process.cwd(), "public", "samples", sample.file)));
      name = sample.file;
      useAi = useAi && body.ai !== false;
    }
    if (String.fromCharCode(...bytes.slice(0, 4)) !== "%PDF") return NextResponse.json({ error: "To nie jest plik PDF" }, { status: 415 });
    return NextResponse.json(await analyzePdf(bytes, name, cfg, { useAi, asOf }));
  } catch (e) {
    return NextResponse.json({ error: `Nie udało się przeanalizować dokumentu: ${(e as Error).message}` }, { status: 500 });
  }
}
