import { NextResponse } from "next/server";
import { z } from "zod";
import { getConfig } from "@/services/config/store";
import { ExtractedDocumentSchema, type CaseEvaluation, type ValidationIssue } from "@/models/document";
import { mergeDocuments } from "@/services/documents/merge";
import { TITLE_LABELS } from "@/models/types";
import { evaluateDocument, fillDocFromProfile, matchProfile, type ProfileInput } from "@/services/documents/evaluate";

/** Dane sprawy z aplikacji – sprawdzamy tylko kształt potrzebny do dopasowania (resztę waliduje silnik). */
const Profile = z.object({ mother: z.object({ pesel: z.string() }).passthrough(), child: z.object({}).passthrough(), plan: z.object({}).passthrough() }).passthrough();

const Body = z.union([
  z.object({ documents: z.array(ExtractedDocumentSchema).min(1).max(12), profile: Profile.optional() }),
  z.object({ document: ExtractedDocumentSchema, fieldFrom: z.record(z.string(), z.number()).optional(), profile: Profile.optional() }),
]);

/**
 * POST /api/documents/evaluate – ocena całej sprawy bez ponownego wysyłania plików.
 *  { documents: [...] } – scala teczkę dokumentów (ZAM + Z-3 + poświadczenie…) i liczy werdykt,
 *  { document }        – przelicza po ręcznej korekcie odczytanych pól.
 *  profile (opcjonalnie) – dane rodziny z aplikacji: gdy PESEL z dokumentów należy do mamy albo taty, brakujące w dokumentach
 *  informacje uzupełniamy z aplikacji, a werdykt liczymy jak kalkulator (z wartościami z dokumentów).
 * Odpowiedź: scalone dane, źródło każdego pola (-1 = z aplikacji), braki spójności, werdykt i podstawa krok po kroku. Bez AI.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nieprawidłowe dane dokumentów" }, { status: 400 });
  const cfg = await getConfig();
  const asOf = new Date().toISOString().slice(0, 10);
  const profile = parsed.data.profile as ProfileInput | undefined;
  const merged = "documents" in parsed.data ? mergeDocuments(parsed.data.documents) : { document: parsed.data.document, fieldFrom: parsed.data.fieldFrom ?? {}, issues: [] as ValidationIssue[] };
  const issues = [...merged.issues];

  const who = matchProfile(merged.document, profile);
  let doc = merged.document;
  const fieldFrom = { ...merged.fieldFrom };
  if (profile && who) {
    const person = who === "ojciec" && profile.father ? profile.father : profile.mother;
    if (doc.title && doc.title !== person.title)
      issues.push({ field: "title", severity: "warning", message: `Tytuł ubezpieczenia w dokumentach („${TITLE_LABELS[doc.title]}”) różni się od zapisanego w aplikacji („${TITLE_LABELS[person.title]}”). Wynik policzono według dokumentów.`, hint: "Sprawdź w PUE/eZUS → Dane o ubezpieczeniach, z jakiego tytułu jesteś zgłoszona/y, i popraw dane w aplikacji albo użyj właściwego druku (Z-3 – pracownik, Z-3a – zleceniobiorca)." });
    const filled = fillDocFromProfile(doc, profile, who);
    doc = filled.document;
    for (const p of filled.filled) fieldFrom[p] ??= -1;
  } else if (profile && merged.document.insured.pesel) {
    issues.push({ field: "insured.pesel", severity: "warning", message: `PESEL z dokumentu (${merged.document.insured.pesel}) nie należy ani do mamy, ani do taty zapisanych w aplikacji – wynik policzono wyłącznie z dokumentu, bez porównania z Twoimi danymi.`, hint: "Sprawdź, czy PESEL na druku nie ma literówki, albo zaloguj się na konto osoby, której dotyczy dokument." });
  }

  const ev = evaluateDocument(doc, cfg, asOf, profile && who ? { profile, who } : undefined);
  if (!who && !doc.incomeMonths.length && !doc.declaredBase && ev.verdict.insured)
    issues.push({ field: "incomeMonths", severity: "info", message: "W dokumentach nie ma wynagrodzeń / przychodów – kwotę oszacowano od podstawy minimalnej. Dołącz Z-3 / Z-3a lub poświadczenie ubezpieczenia, aby uzyskać dokładny wynik.", hint: "Zaświadczenie Z-3 (pracownik) lub Z-3a (zleceniobiorca) wystawia płatnik składek – poproś kadry." });
  const out: CaseEvaluation = { ...ev, fieldFrom, issues, profileMatch: profile ? who : undefined };
  return NextResponse.json(out);
}
