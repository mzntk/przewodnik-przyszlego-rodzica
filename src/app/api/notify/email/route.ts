import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * POST /api/notify/email – SYMULACJA wysyłki powiadomienia e-mail (wersja webowa).
 * W produkcji: kolejka + dostawca poczty (np. SMTP ZUS / AWS SES) z szablonem bez danych wrażliwych.
 * W aplikacji mobilnej ten sam temat trafia jako powiadomienie push (APNs / FCM).
 */
const Body = z.object({ to: z.email(), subject: z.string().max(200), body: z.string().max(1000) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowy adres lub treść" }, { status: 400 });
  // RODO: w treści e-maila nie wysyłamy kwot ani danych o zdrowiu – tylko temat i link do aplikacji.
  return NextResponse.json({ sent: true, simulated: true, to: parsed.data.to.replace(/(.).+(@.+)/, "$1***$2") });
}
