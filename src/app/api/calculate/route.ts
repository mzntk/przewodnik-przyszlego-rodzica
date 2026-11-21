import { NextResponse } from "next/server";
import { getConfig } from "@/services/config/store";
import { calculate } from "@/services/engine";
import type { CaseInput } from "@/models/types";

/** POST /api/calculate – deterministyczny silnik uprawnień i kalkulator (bez AI). Body: CaseInput */
export async function POST(req: Request) {
  try {
    const input = (await req.json()) as CaseInput;
    if (!input?.mother || !input?.child?.dueDate) return NextResponse.json({ error: "Brak wymaganych danych (mother, child.dueDate)" }, { status: 400 });
    const cfg = await getConfig();
    return NextResponse.json(calculate({ ...input, asOf: input.asOf ?? new Date().toISOString().slice(0, 10) }, cfg));
  } catch (e) {
    return NextResponse.json({ error: `Błąd obliczeń: ${(e as Error).message}` }, { status: 500 });
  }
}
