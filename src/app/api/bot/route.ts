import { NextResponse } from "next/server";
import { z } from "zod";
import { askBot } from "@/services/ai/bot";

/** POST /api/bot – ⚡ ZUSia (wspierana przez AI, z fallbackiem regułowym). Body: { message, history } */
const Body = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(20).optional(),
});

// Prosty limit zapytań na adres IP (pamięć procesu – w produkcji: Redis / API Gateway)
const hits = new Map<string, number[]>();
const LIMIT = 20;
const WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return NextResponse.json({ error: "Za dużo pytań naraz – odczekaj chwilę." }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe zapytanie" }, { status: 400 });
  // usuwamy znaki sterujące i niewidoczne (częsty nośnik ukrytych instrukcji)
  const clean = (t: string) => t.replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, "");
  return NextResponse.json(await askBot(clean(parsed.data.message), (parsed.data.history ?? []).map((h) => ({ ...h, content: clean(h.content) }))));
}
