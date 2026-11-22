import { NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_FORMS, type OfficialFormId } from "@/data/official-forms";
import { checkForm } from "@/services/forms/check";

const Body = z.object({
  form: z.enum(Object.keys(OFFICIAL_FORMS) as [OfficialFormId, ...OfficialFormId[]]),
  values: z.record(z.string(), z.union([z.string(), z.boolean()])),
});

/**
 * POST /api/forms/check – FORMUŁY SPRAWDZANIA: { form: "ZAM", values: { "Page1.PESEL": "…", "Page2.TAK": true, … } }.
 * Sumy kontrolne (PESEL, NIP, REGON, NRB, dowód), daty, pola wymagane, wykluczające się zaznaczenia, zależności między polami.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Oczekiwano { form, values }", forms: Object.keys(OFFICIAL_FORMS) }, { status: 400 });
  return NextResponse.json(checkForm(parsed.data.form, parsed.data.values, { requireFields: true }));
}
