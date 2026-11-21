import { NextResponse, connection } from "next/server";
import { aiAvailable, AI_MODEL } from "@/services/ai/client";
import { getConfig } from "@/services/config/store";

export async function GET() {
  await connection(); // zawsze dynamicznie (stan serwera, dostępność AI)
  const cfg = await getConfig();
  return NextResponse.json({ status: "ok", configVersion: cfg.version, ai: { available: aiAvailable(), model: AI_MODEL } });
}
