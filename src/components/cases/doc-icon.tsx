import { Baby, Building2, CalendarClock, CalendarHeart, FileText, Flower2, HandCoins, HeartPulse, ShieldPlus, Stethoscope, UserCheck, Wallet } from "lucide-react";
import type { DocId } from "@/data/documents";
import { cn } from "@/lib/utils";

/** Ikona rodzaju druku – żeby „Wniosek”, „ZAM”, „Z-3” dało się odróżnić na pierwszy rzut oka. */
const ICONS: Record<DocId, typeof FileText> = {
  "URLOP-MAC-PRZED": CalendarClock,
  "URLOP-RODZ": CalendarHeart,
  "URLOP-RODZ-TATA": CalendarHeart,
  "URLOP-LACZENIE": CalendarHeart,
  "URLOP-UZUP": CalendarHeart,
  "URLOP-OJC": CalendarHeart,
  ZAM: HandCoins,
  "Z-3": Building2,
  "Z-3a": Building2,
  "ZAS-53": Stethoscope,
  "Z-15A": HeartPulse,
  "Z-12": Flower2,
  "USC-REJESTRACJA": Baby,
  "NFZ-ZGLOSZENIE": ShieldPlus,
  "800PLUS": Wallet,
  "ZUS-ZUA": UserCheck,
};

export function DocIcon({ id, code, className }: { id: DocId; code: string; className?: string }) {
  const Icon = ICONS[id] ?? FileText;
  return (
    <span className={cn("flex w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg border border-line bg-white px-1 py-1.5", className)} aria-hidden>
      <Icon className="h-5 w-5 text-brand" strokeWidth={2} />
      <span className="max-w-full truncate text-[11px] leading-none font-bold text-fg-2">{code}</span>
    </span>
  );
}
