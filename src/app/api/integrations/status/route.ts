import { NextResponse } from "next/server";
import { syncStatuses, type SyncInput } from "@/services/case-sync";

/** POST /api/integrations/status – SYMULACJA pobrania statusów spraw z ZUS. Body: { profileId, cases: [{ id, state? }] } */
export async function POST(req: Request) {
  const body = (await req.json()) as { profileId: string | null; cases: SyncInput[] };
  if (!Array.isArray(body.cases)) return NextResponse.json({ error: "Brak listy spraw" }, { status: 400 });
  return NextResponse.json({ syncedAt: new Date().toISOString(), statuses: syncStatuses(body.profileId, body.cases, new Date()) });
}
