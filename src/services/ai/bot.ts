/**
 * ⚡ WSPIERANE PRZEZ AI – ZUS-bot. Odpowiada prostym językiem WYŁĄCZNIE na podstawie bazy wiedzy
 * (streszczenia Poradnika ZUS 2026). Kwot nie liczy – odsyła do deterministycznego kalkulatora.
 * Bez klucza API działa tryb regułowy (wyszukiwanie w bazie wiedzy).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { KNOWLEDGE, searchKnowledge, type KnowledgeEntry } from "@/data/knowledge";
import { AI_MODEL, aiAvailable, getClient } from "./client";

export interface BotReply {
  answer: string;
  sources: { id: string; q: string; legal?: string }[];
  links: { label: string; href: string }[];
  ai: boolean;
  note?: string;
}

const KB_TEXT = KNOWLEDGE.map((k) => `[${k.id}] ${k.q}\n${k.a}${k.legal ? `\nPodstawa: ${k.legal}` : ""}`).join("\n\n");

const SYSTEM = `Jesteś ZUS-botem w aplikacji „Zasiłkowy Przewodnik Przyszłego Rodzica”. Odpowiadasz po polsku, prostym, ciepłym językiem, krótko (maks. ok. 120 słów).
Zasady:
- Odpowiadaj WYŁĄCZNIE na podstawie bazy wiedzy poniżej. Jeśli baza nie zawiera odpowiedzi, powiedz o tym i zaproponuj kontakt z ZUS (PUE/eZUS, infolinia 22 560 16 00) lub właściwy moduł aplikacji.
- Nie obliczaj kwot zasiłków – zawsze odsyłaj do kalkulatora w aplikacji, który liczy deterministycznie.
- Gdy podajesz zasadę, dodaj podstawę prawną z bazy.
- Od 24.10.2026 r. druki ZUR, ZAO i Z-3b nie istnieją – używaj ZAM.
- Na końcu odpowiedzi podaj w nawiasie kwadratowym identyfikatory wykorzystanych wpisów, np. [ile-wynosi, kto-wyplaca].

<baza_wiedzy>
${KB_TEXT}
</baza_wiedzy>`;

export async function askBot(message: string, history: { role: "user" | "assistant"; content: string }[]): Promise<BotReply> {
  const hits = searchKnowledge(message, 3);
  const fallback = (): BotReply => ruleBased(message, hits);
  if (!aiAvailable()) return { ...fallback(), note: "Tryb regułowy (AI wyłączone)." };
  try {
    const messages: Anthropic.Beta.BetaMessageParam[] = [...history.slice(-8).map((h) => ({ role: h.role, content: h.content })), { role: "user", content: message }];
    // Server-side fallback: przy odmowie z powodów bezpieczeństwa API samo ponawia na modelu zapasowym.
    const response = await getClient().beta.messages.create({
      model: AI_MODEL,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 2000,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "low" },
      messages,
    });
    if (response.stop_reason === "refusal") return { ...fallback(), note: "Model odmówił – odpowiedź z bazy wiedzy." };
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    const ids = [...text.matchAll(/\[([a-z0-9-,\s]+)\]\s*$/g)].flatMap((m) => m[1].split(",").map((s) => s.trim()));
    const used = KNOWLEDGE.filter((k) => ids.includes(k.id));
    const src = used.length ? used : hits;
    return {
      answer: text.replace(/\[([a-z0-9-,\s]+)\]\s*$/g, "").trim(),
      sources: src.map((k) => ({ id: k.id, q: k.q, legal: k.legal })),
      links: uniqLinks(src),
      ai: true,
    };
  } catch (error) {
    const note = error instanceof Anthropic.APIError ? `AI niedostępne (${error.status}) – odpowiedź z bazy wiedzy.` : "AI niedostępne – odpowiedź z bazy wiedzy.";
    return { ...fallback(), note };
  }
}

function ruleBased(message: string, hits: KnowledgeEntry[]): BotReply {
  if (!hits.length) {
    return {
      answer: "Nie znalazłem odpowiedzi w bazie wiedzy. Spróbuj zapytać inaczej (np. „ile wynosi zasiłek macierzyński”, „kto wypłaca zasiłek”) albo skontaktuj się z ZUS przez PUE/eZUS lub infolinię 22 560 16 00.",
      sources: [],
      links: [{ label: "Otwórz kalkulator", href: "/kalkulator" }],
      ai: false,
    };
  }
  const [top, ...rest] = hits;
  return {
    answer: `${top.a}${top.legal ? `\n\nPodstawa prawna: ${top.legal}.` : ""}${rest.length ? `\n\nZobacz też: ${rest.map((r) => `„${r.q}”`).join(", ")}.` : ""}`,
    sources: hits.map((k) => ({ id: k.id, q: k.q, legal: k.legal })),
    links: uniqLinks(hits),
    ai: false,
  };
}

function uniqLinks(entries: KnowledgeEntry[]) {
  const seen = new Set<string>();
  return entries.flatMap((e) => e.links ?? []).filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true))).slice(0, 3);
}
