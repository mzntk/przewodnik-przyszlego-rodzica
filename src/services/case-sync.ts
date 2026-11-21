/**
 * SYMULACJA synchronizacji statusów spraw z ZUS (w produkcji: API PUE/eZUS, rejestr USC, płatnik).
 * Czysta funkcja – ten sam wynik dla tych samych danych wejściowych i czasu.
 */
import type { CaseState, CaseStatus } from "@/models/case-status";
import type { DocId } from "@/data/documents";
import { getFamily } from "@/data/families";

/** Stan spraw zastany w systemach ZUS dla profili testowych. */
const SEED: Record<string, Partial<Record<DocId, { status: CaseStatus; note?: string }>>> = {
  "anna-uop": {
    "Z-3": { status: "zarejestrowany", note: "Pracodawca przekazał Z-3 do ZUS (20.10.2026) – sprawa nr ZAS/1123/2026." },
    "URLOP-MAC-PRZED": { status: "weryfikacja", note: "Kadry czekają na zaświadczenie lekarskie o przewidywanej dacie porodu." },
    "URLOP-LACZENIE": { status: "niezlozony" },
  },
  "magda-jdg": {
    "ZAS-53": { status: "uzupelnienie", note: "Zaległość w składkach 312,45 zł – spłać całość i prześlij potwierdzenie przez PUE/eZUS (termin: 7 dni)." },
    "ZUS-ZUA": { status: "przyznany", note: "Zgłoszenie do dobrowolnego ubezpieczenia chorobowego przyjęte 02.03.2026." },
  },
  "nowak-wczesniaki": {
    "USC-REJESTRACJA": { status: "przyznany", note: "Akt urodzenia sporządzony 14.10.2026, PESEL nadany obojgu dzieciom." },
    "NFZ-ZGLOSZENIE": { status: "przyznany", note: "Dzieci zgłoszone do ubezpieczenia zdrowotnego przez pracodawcę taty (ZUS ZCNA)." },
    "URLOP-RODZ": { status: "przyznany", note: "Wniosek o 81,5% złożony w terminie – wypłata przez pracodawcę z wynagrodzeniem." },
    "URLOP-UZUP": { status: "weryfikacja", note: "Pracodawca czeka na zaświadczenie szpitala o pobycie dzieci (52 dni)." },
    "URLOP-OJC": { status: "przyznany", note: "Urlop ojcowski 2 × 7 dni zatwierdzony przez pracodawcę Tomasza." },
    "800PLUS": { status: "zarejestrowany", note: "Wniosek 800+ przyjęty przez PUE/eZUS (nr 800/2026/55120) – świadczenie z wyrównaniem od dnia urodzenia." },
  },
  "julia-student": {
    "800PLUS": { status: "weryfikacja", note: "ZUS weryfikuje dane drugiego rodzica we wniosku 800+." },
  },
  "lis-adopcja": {
    ZAM: { status: "weryfikacja", note: "ZUS sprawdza zaświadczenie sądu opiekuńczego o wszczęciu postępowania." },
    "Z-3a": { status: "przyznany", note: "Zleceniodawca przekazał Z-3a – podstawa wymiaru ustalona: 6 842,10 zł." },
    "800PLUS": { status: "przyznany", note: "Decyzja: 800 zł miesięcznie od września 2026 r. Wypłata do 10. dnia miesiąca." },
    "ZUS-ZUA": { status: "uzupelnienie", note: "Brak daty powrotu do dobrowolnego chorobowego po urlopie – uzupełnij zgłoszenie ZUA." },
  },
};

/** Przyspieszone tempo demonstracji: rejestracja → weryfikacja po 15 s, decyzja po 45 s. */
const TO_REVIEW_MS = 15_000;
const TO_DECISION_MS = 45_000;

export interface SyncInput {
  id: DocId;
  state?: CaseState;
}

export function syncStatuses(profileId: string | null, cases: SyncInput[], now: Date): Record<string, CaseState> {
  const seed = (profileId && (SEED[profileId] ?? generatedSeed(profileId))) || {};
  const at = now.toISOString();
  const out: Record<string, CaseState> = {};
  for (const { id, state } of cases) {
    if (!state || (!state.submittedAt && state.status === "niezlozony")) {
      const s = seed[id];
      out[id] = s ? { status: s.status, note: s.note, updatedAt: at } : (state ?? { status: "niezlozony", updatedAt: at });
      continue;
    }
    if (!state.submittedAt) {
      out[id] = state;
      continue;
    }
    const elapsed = now.getTime() - Date.parse(state.submittedAt);
    let next: CaseStatus = state.status;
    let note = state.note;
    if (state.status === "zarejestrowany" && elapsed >= TO_REVIEW_MS) {
      next = "weryfikacja";
      note = "Wniosek jest sprawdzany pod kątem formalnym.";
    }
    if (state.status !== "przyznany" && state.status !== "uzupelnienie" && elapsed >= TO_DECISION_MS) {
      next = state.complete === false ? "uzupelnienie" : "przyznany";
      note = state.complete === false ? "Brakuje wymaganych danych lub załączników – uzupełnij wniosek." : "Sprawa rozpatrzona pozytywnie.";
    }
    out[id] = next === state.status ? state : { ...state, status: next, note, updatedAt: at };
  }
  return out;
}

/** Stan spraw dla wylosowanych rodzin: po porodzie część formalności jest już załatwiona, firmy z długiem – wezwanie do spłaty. */
function generatedSeed(profileId: string): Partial<Record<DocId, { status: CaseStatus; note?: string }>> {
  const f = getFamily(profileId);
  if (!f) return {};
  const c = f.input.child;
  const m = f.input.mother;
  const out: Partial<Record<DocId, { status: CaseStatus; note?: string }>> = {};
  const n = f.no;
  if (c.birthDate) {
    out["USC-REJESTRACJA"] = { status: "przyznany", note: "Akt urodzenia sporządzony, PESEL nadany." };
    out["NFZ-ZGLOSZENIE"] = n % 3 === 0 ? { status: "zarejestrowany", note: "Zgłoszenie ZCNA przyjęte – oczekuje na potwierdzenie." } : { status: "przyznany", note: "Dziecko zgłoszone do ubezpieczenia zdrowotnego." };
    out["800PLUS"] = n % 2 === 0 ? { status: "weryfikacja", note: "ZUS weryfikuje wniosek 800+ – wyrównanie od dnia urodzenia." } : { status: "przyznany", note: "Decyzja: 800 zł miesięcznie, wypłata do 10. dnia miesiąca." };
    if (m.title === "uop") out["URLOP-RODZ"] = n % 4 === 0 ? { status: "weryfikacja", note: "Kadry weryfikują wniosek o urlop rodzicielski." } : { status: "przyznany", note: "Urlop rodzicielski zatwierdzony przez pracodawcę." };
    else out.ZAM = n % 5 === 0 ? { status: "uzupelnienie", note: "Brak numeru rachunku bankowego we wniosku ZAM – uzupełnij przez PUE/eZUS." } : { status: "weryfikacja", note: "ZUS weryfikuje wniosek ZAM i dane z rejestru USC." };
  } else if (m.title === "uop" && (m.payer?.insuredCount ?? 0) <= 20 && m.sickLeaves.length) {
    out["Z-3"] = { status: "zarejestrowany", note: "Pracodawca przekazał Z-3 do ZUS – zasiłek chorobowy wypłaci ZUS." };
  }
  if (m.contributionDebt && m.sickLeaves.length) out["ZAS-53"] = { status: "uzupelnienie", note: `Zaległość w składkach ${m.contributionDebt.toFixed(2).replace(".", ",")} zł – spłać całość, aby ZUS wypłacił zasiłek.` };
  if (c.path !== "biologiczny" && m.title !== "uop") out.ZAM = { status: "weryfikacja", note: "ZUS sprawdza zaświadczenie sądu opiekuńczego." };
  return out;
}
