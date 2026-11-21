import { NextResponse } from "next/server";
import { resetConfig } from "@/services/config/store";

/** POST /api/config/reset – przywrócenie wartości ustawowych na 2026 r. */
export async function POST(req: Request) {
  if (req.headers.get("x-role") !== "admin") return NextResponse.json({ error: "Wymagana rola administratora" }, { status: 403 });
  return NextResponse.json({ config: await resetConfig() });
}
