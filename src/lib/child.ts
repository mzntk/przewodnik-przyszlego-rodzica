/** Dane dziecka w tekstach aplikacji i w dokumentach (imię, płeć, dane z aktu urodzenia). */
import type { ChildEvent, KidInfo } from "@/models/types";
import { dPL } from "./utils";

/** Lista dzieci zawsze o długości `childrenCount` (bliźnięta – dwa wpisy). */
export function kidsOf(c: ChildEvent): KidInfo[] {
  const n = Math.max(1, c.childrenCount);
  return Array.from({ length: n }, (_, i) => c.kids?.[i] ?? { sex: "nie_wiem" });
}

/** „Zosia”, „Hania i Staś”, albo null, gdy rodzice nie podali imion. */
export function childNames(c: ChildEvent): string | null {
  const names = kidsOf(c).map((k) => k.name?.trim()).filter(Boolean) as string[];
  if (!names.length) return null;
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} i ${names.at(-1)}`;
}

/** Imię albo neutralne „Twoje dziecko / Wasze dzieci”. */
export function childLabel(c: ChildEvent, cap = true): string {
  const n = childNames(c);
  if (n) return n;
  const s = kidsOf(c).length > 1 ? "wasze dzieci" : "twoje dziecko";
  return cap ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Czy brakuje danych z aktu urodzenia potrzebnych do dokumentów. */
export const missingBirthData = (c: ChildEvent) => !!c.birthDate && kidsOf(c).some((k) => !k.fullName?.trim() || !k.lastName?.trim());

/** Linia do formularza: „Zofia Kowalska, ur. 12.01.2027, PESEL 27211201234”. */
export function childLine(c: ChildEvent, fallbackLastName = ""): string {
  const date = c.birthDate ? `ur. ${dPL(c.birthDate)}` : `termin ${dPL(c.dueDate)}`;
  return kidsOf(c)
    .map((k) => [[k.fullName || k.name, k.lastName || fallbackLastName].filter(Boolean).join(" ") || "dziecko", date, k.pesel ? `PESEL ${k.pesel}` : ""].filter(Boolean).join(", "))
    .join("; ");
}
