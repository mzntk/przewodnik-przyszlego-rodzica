/**
 * WSTĘPNE WYPEŁNIENIE: dane sprawy (CaseInput) + wynik silnika → wartości pól oficjalnego druku → PDF.
 * W aplikacji działa w przeglądarce (lib/official-pdf.fillOfficialPdf); tu – po stronie serwera dla REST: POST /api/forms/prefill.
 */
import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { OFFICIAL_FORMS, fillValues, type FieldValue, type OfficialFormId } from "@/data/official-forms";
import type { CaseInput } from "@/models/types";
import type { LegalConfig } from "@/models/legal-config";
import { calculate } from "@/services/engine";
import { fillOfficialPdfBytes } from "@/lib/official-pdf";

export function prefillValues(form: OfficialFormId, input: CaseInput, cfg: LegalConfig, who: "matka" | "ojciec" = "matka"): Record<string, FieldValue> {
  return fillValues(form, { d: input, r: calculate(input, cfg), who, today: input.asOf });
}

export async function prefillPdf(form: OfficialFormId, values: Record<string, FieldValue>): Promise<Uint8Array> {
  const root = path.join(process.cwd(), "public");
  const [tpl, font] = await Promise.all([fs.readFile(path.join(root, "formularze", OFFICIAL_FORMS[form].file)), fs.readFile(path.join(root, "fonts", "Lato_400Regular.ttf"))]);
  return fillOfficialPdfBytes(tpl, font, values);
}
