"use client";
import { ExternalLink, Scale, Sparkles } from "lucide-react";
import { ACTS, findQuote } from "@/data/legal-quotes";
import { HoverPopover } from "./info-tip";
import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "orange" | "gold" | "red" | "neutral";
const tones: Record<Tone, string> = {
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  orange: "bg-orange-soft text-orange",
  gold: "bg-gold-soft text-gold",
  red: "bg-red-soft text-red",
  neutral: "bg-surface-2 text-fg-2",
};

export function Badge({ tone = "neutral", className, children, dot }: { tone?: Tone; className?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Wymóg regulaminu ZUS: jawne oznaczenie funkcji wspieranych przez AI. */
export function AiBadge({ className, active = true }: { className?: string; active?: boolean }) {
  return (
    <span
      title="Funkcja wspierana przez sztuczną inteligencję (Claude). Obliczenia i rozstrzygnięcia wykonuje deterministyczny silnik."
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[13px] font-semibold tracking-wide uppercase",
        active ? "border-[color-mix(in_oklab,var(--gold)_40%,transparent)] bg-gold-soft text-gold" : "border-line bg-surface-2 text-muted",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" /> Wspierane przez AI
    </span>
  );
}

const chipCls = "inline-flex items-center rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[12px] text-muted";

/** Oznaczenie przepisu. Po najechaniu / dotknięciu – dokładny cytat (jeśli jest w bazie) i link do ISAP. */
export function LegalChip({ children, className }: { children: React.ReactNode; className?: string }) {
  const label = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : "";
  const { quote, act } = findQuote(label);
  if (!act) return <span className={cn(chipCls, className)}>{children}</span>;
  return (
    <HoverPopover label={`Treść przepisu: ${label}`} width={380} className={cn(chipCls, "cursor-help gap-1 text-left hover:border-brand hover:text-brand", className)} trigger={<><Scale className="h-3 w-3 shrink-0" aria-hidden />{children}</>}>
      <div className="text-[13px] font-bold tracking-wide text-brand uppercase">{quote?.ref ?? label}</div>
      {quote ? (
        <blockquote className="mt-2 border-l-2 border-brand pl-3 text-[14px] leading-relaxed text-fg-2 italic">„{quote.text}”</blockquote>
      ) : (
        <p className="mt-2 text-[14px] text-fg-2">Pełne brzmienie przepisu znajdziesz w tekście ustawy.</p>
      )}
      <a href={ACTS[act].isap} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-brand hover:underline">
        {ACTS[act].name} – ISAP <ExternalLink className="h-3 w-3" />
      </a>
      <p className="mt-2 text-[12px] text-muted">Cytat z tekstu jednolitego. Przed ważną decyzją sprawdź aktualne brzmienie w ISAP.</p>
    </HoverPopover>
  );
}

export const toneText: Record<Tone, string> = { blue: "text-blue", green: "text-green", orange: "text-orange", gold: "text-gold", red: "text-red", neutral: "text-fg-2" };
export const toneBg: Record<Tone, string> = tones;
