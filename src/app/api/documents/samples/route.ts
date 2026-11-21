import { NextResponse, connection } from "next/server";
import { SAMPLE_CASES } from "@/data/samples";
import { aiAvailable } from "@/services/ai/client";

export async function GET() {
  await connection(); // zawsze dynamicznie (stan serwera, dostępność AI)
  return NextResponse.json({ samples: SAMPLE_CASES, aiAvailable: aiAvailable() });
}
