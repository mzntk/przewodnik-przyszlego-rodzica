import { NextResponse } from "next/server";
import { getConfig } from "@/services/config/store";
import { simulateZusFetch } from "@/services/integrations";

/** GET /api/integrations/zus?profile=<id> – SYMULACJA pobrania danych z PUE/eZUS, zaświadczenia o niezaleganiu i e-ZLA. */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("profile") ?? "";
  await new Promise((r) => setTimeout(r, 650)); // realistyczne opóźnienie „systemu”
  const data = simulateZusFetch(id, await getConfig());
  return data ? NextResponse.json(data) : NextResponse.json({ error: "Brak danych dla profilu" }, { status: 404 });
}
