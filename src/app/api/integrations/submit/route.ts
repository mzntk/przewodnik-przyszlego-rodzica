import { NextResponse } from "next/server";
import { simulateSubmission } from "@/services/integrations";

/** POST /api/integrations/submit – SYMULACJA wysyłki wniosku do ZUS/pracodawcy/USC. */
export async function POST(req: Request) {
  const { form, payer, complete } = (await req.json()) as { form: string; payer: "zus" | "pracodawca"; complete: boolean };
  await new Promise((r) => setTimeout(r, 500));
  return NextResponse.json(simulateSubmission(form, payer, complete));
}
