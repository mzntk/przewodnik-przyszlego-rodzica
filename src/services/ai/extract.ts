/**
 * ⚡ WSPIERANE PRZEZ AI – mapowanie dokumentu do ustandaryzowanego JSON (Structured Output).
 * Dla PDF-ów bez warstwy tekstowej (skany) Claude odczytuje dokument bezpośrednio (OCR/vision).
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ExtractedDocumentSchema, type ExtractedDocument } from "@/models/document";
import { AI_MODEL, aiAvailable, getClient } from "./client";

const SYSTEM = `Jesteś modułem ekstrakcji danych z polskich dokumentów ZUS (ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15A/B, Z-12, poświadczenia ubezpieczenia, zrzuty systemowe, e-ZLA).
Zwróć wyłącznie dane, które są w dokumencie. Gdy pola nie ma – null. Nie obliczaj żadnych kwot ani uprawnień i nie zgaduj.
Daty w formacie RRRR-MM-DD, miesiące w formacie RRRR-MM, kwoty jako liczby (kropka dziesiętna).
"signed" = true tylko wtedy, gdy dokument zawiera podpis (np. adnotację o podpisie elektronicznym lub imię i nazwisko w polu podpisu); puste pole podpisu = false.
"title": uop = umowa o pracę, zlecenie = umowa zlecenia, jdg = działalność gospodarcza (pełny ZUS), jdg_preferencyjna, maly_zus_plus, ulga_na_start, student_zlecenie = student/uczeń do 26 lat na zleceniu.`;

export async function aiExtract(input: { text?: string; pdfBase64?: string }): Promise<{ doc: ExtractedDocument | null; note: string }> {
  if (!aiAvailable()) return { doc: null, note: "AI wyłączone (brak klucza ANTHROPIC_API_KEY) – użyto wyłącznie parsera regułowego." };
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.pdfBase64) {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 } });
    content.push({ type: "text", text: "Odczytaj ten dokument ZUS (może być skanem) i zmapuj go na schemat." });
  } else {
    content.push({ type: "text", text: `Tekst dokumentu:\n<dokument>\n${input.text}\n</dokument>\nZmapuj go na schemat.` });
  }
  try {
    const response = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(ExtractedDocumentSchema) },
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") return { doc: null, note: "Model odmówił przetworzenia – użyto parsera regułowego." };
    return { doc: response.parsed_output ?? null, note: `Mapowanie AI: ${AI_MODEL} (Structured Output).` };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { doc: null, note: "Nieprawidłowy klucz API – użyto parsera regułowego." };
    if (error instanceof Anthropic.RateLimitError) return { doc: null, note: "Limit zapytań AI – użyto parsera regułowego." };
    if (error instanceof Anthropic.APIError) return { doc: null, note: `Błąd API AI (${error.status}) – użyto parsera regułowego.` };
    return { doc: null, note: "AI niedostępne (sieć) – użyto parsera regułowego." };
  }
}
