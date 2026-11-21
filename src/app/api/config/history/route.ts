import { NextResponse, connection } from "next/server";
import { getHistory } from "@/services/config/store";

export async function GET() {
  await connection(); // zawsze dynamicznie (stan serwera, dostępność AI)
  return NextResponse.json({ history: getHistory() });
}
