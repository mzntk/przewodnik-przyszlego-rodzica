import { NextResponse } from "next/server";
import { z } from "zod";
import { OFFICIAL_FORMS, type OfficialFormId } from "@/data/official-forms";
import { getConfig } from "@/services/config/store";
import { getFamily } from "@/data/families";
import { prefillPdf, prefillValues } from "@/services/forms/prefill";
import { checkForm } from "@/services/forms/check";
import type { CaseInput } from "@/models/types";

const Body = z.object({
  form: z.enum(Object.keys(OFFICIAL_FORMS) as [OfficialFormId, ...OfficialFormId[]]),
  who: z.enum(["matka", "ojciec"]).default("matka"),
  /** dane sprawy (CaseInput) – albo identyfikator rodziny testowej, albo gotowe wartości pól */
  input: z.unknown().optional(),
  profile: z.string().optional(),
  values: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  format: z.enum(["json", "pdf"]).default("json"),
});

/**
 * POST /api/forms/prefill – WSTĘPNE WYPEŁNIENIE oficjalnego druku ZUS.
 *  { form: "ZAM", profile: "rodzina-042" }              → wartości pól (JSON) + wynik formuł sprawdzania
 *  { form: "ZAM", profile: "rodzina-042", format: "pdf" } → wypełniony, edytowalny PDF
 *  { form: "ZAM", input: <CaseInput> } / { form, values } – własne dane albo poprawione wartości
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Oczekiwano { form, profile | input | values, who?, format? }", forms: Object.keys(OFFICIAL_FORMS) }, { status: 400 });
  const { form, who, profile, values: given, format } = parsed.data;
  const asOf = new Date().toISOString().slice(0, 10);
  let values = given;
  if (!values) {
    const fam = profile ? getFamily(profile, asOf) : undefined;
    const input = (parsed.data.input as CaseInput | undefined) ?? (fam ? { ...fam.input, asOf } : undefined);
    if (!input) return NextResponse.json({ error: "Podaj profile (np. rodzina-042), input (CaseInput) albo values" }, { status: 400 });
    values = prefillValues(form, { ...input, asOf: input.asOf ?? asOf }, await getConfig(), who);
  }
  if (format === "pdf") {
    const bytes = await prefillPdf(form, values);
    return new NextResponse(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${OFFICIAL_FORMS[form].file.replace(".pdf", "")}-wypelniony.pdf"` } });
  }
  return NextResponse.json({ form, meta: OFFICIAL_FORMS[form], values, check: checkForm(form, values) });
}
