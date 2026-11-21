import { NextResponse } from "next/server";
import { askBot } from "@/services/ai/bot";

/** POST /api/bot – ⚡ ZUS-bot (wspierany przez AI, z fallbackiem regułowym). Body: { message, history } */
export async function POST(req: Request) {
  const { message, history } = (await req.json()) as { message: string; history?: { role: "user" | "assistant"; content: string }[] };
  if (!message?.trim()) return NextResponse.json({ error: "Pusta wiadomość" }, { status: 400 });
  return NextResponse.json(await askBot(message.slice(0, 1000), history ?? []));
}
