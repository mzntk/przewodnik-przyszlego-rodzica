import { NextResponse, connection } from "next/server";
import { TEST_PROFILES } from "@/data/profiles";

/** GET /api/profiles – profile testowe (symulacja mObywatel). */
export async function GET() {
  await connection(); // zawsze dynamicznie (stan serwera, dostępność AI)
  return NextResponse.json({ profiles: TEST_PROFILES });
}
