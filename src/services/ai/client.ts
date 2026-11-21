/**
 * ⚡ FUNKCJE WSPIERANE PRZEZ AI (oznaczone zgodnie z wymogiem regulaminu ZUS).
 * AI jest używane WYŁĄCZNIE do: (1) mapowania tekstu/obrazu dokumentu do ustandaryzowanego JSON,
 * (2) odpowiedzi ZUS-bota prostym językiem. AI NIGDY nie liczy kwot ani nie rozstrzyga uprawnień –
 * robi to deterministyczny silnik w services/engine.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) && process.env.AI_DISABLED !== "1";
}

export function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
