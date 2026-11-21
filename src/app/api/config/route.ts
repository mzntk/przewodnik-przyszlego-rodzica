import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/services/config/store";
import { CONFIG_FIELDS } from "@/models/legal-config";

/** GET /api/config – aktualne parametry legislacyjne. */
export async function GET() {
  return NextResponse.json({ config: await getConfig(), fields: CONFIG_FIELDS });
}

/** PATCH /api/config – edycja parametrów (rola: admin). Body: { "rates.parental": 0.7, ... } */
export async function PATCH(req: Request) {
  if (req.headers.get("x-role") !== "admin") return NextResponse.json({ error: "Wymagana rola administratora" }, { status: 403 });
  try {
    const patch = (await req.json()) as Record<string, number>;
    return NextResponse.json({ config: await updateConfig(patch) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
