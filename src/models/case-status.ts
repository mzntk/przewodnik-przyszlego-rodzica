import type { Recipient } from "@/data/documents";

/** Statusy spraw – nadawane wyłącznie przez system (synchronizacja z ZUS), nigdy ręcznie. */
export const CASE_STATUSES = ["niezlozony", "zarejestrowany", "weryfikacja", "uzupelnienie", "przyznany"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export interface CaseState {
  status: CaseStatus;
  updatedAt: string;
  submittedAt?: string;
  complete?: boolean;
  note?: string;
}

export function statusLabel(status: CaseStatus, to: Recipient): string {
  switch (status) {
    case "niezlozony":
      return "Niezłożony";
    case "zarejestrowany":
      return to === "ZUS" ? "Wysłany · zarejestrowany w ZUS" : to === "USC" ? "Wysłany · zarejestrowany w USC" : "Wysłany · przyjęty przez pracodawcę";
    case "weryfikacja":
      return "W trakcie weryfikacji";
    case "uzupelnienie":
      return "Wymaga uzupełnienia";
    case "przyznany":
      return to === "USC" ? "Załatwiony" : to === "pracodawca" ? "Zatwierdzony" : "Przyznany";
  }
}

export const STATUS_TONE = {
  niezlozony: "neutral",
  zarejestrowany: "blue",
  weryfikacja: "gold",
  uzupelnienie: "red",
  przyznany: "green",
} as const satisfies Record<CaseStatus, "neutral" | "blue" | "gold" | "red" | "green">;
