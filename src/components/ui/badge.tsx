"use client";
import { ExternalLink, Scale, Sparkles } from "lucide-react";
import { ACTS, LEGAL_REF, findQuotes, type ActId } from "@/data/legal-quotes";
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

const textOf = (children: React.ReactNode): string => (typeof children === "string" || typeof children === "number" ? String(children) : Array.isArray(children) ? children.map(textOf).join("") : "");

/** Treść dymka przepisu: cytat (jeśli jest w bazie) albo link do pełnego tekstu – dla KAŻDEGO oznaczenia. */
function LegalPopover({ label, contextAct }: { label: string; contextAct?: ActId }) {
  const hits = findQuotes(label, contextAct);
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto">
      {hits.map((h) => (
        <div key={h.label}>
          <div className="text-[13px] font-bold tracking-wide text-brand uppercase">{h.quote?.ref ?? h.label}</div>
          {h.quote ? (
            <blockquote className="mt-2 border-l-2 border-brand pl-3 text-[14px] leading-relaxed text-fg-2 italic">„{h.quote.text}”</blockquote>
          ) : (
            <p className="mt-1.5 text-[14px] text-fg-2">Pełne brzmienie tego przepisu znajdziesz w tekście aktu.</p>
          )}
          <a href={ACTS[h.act].isap} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-brand hover:underline">
            {ACTS[h.act].name} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ))}
      <p className="text-[12px] text-muted">Cytaty z tekstów jednolitych. Przed ważną decyzją sprawdź aktualne brzmienie w ISAP.</p>
    </div>
  );
}

/** Oznaczenie przepisu (etykieta). Każde jest podświetlane – po najechaniu / dotknięciu cytat i link do aktu. */
export function LegalChip({ children, className, contextAct }: { children: React.ReactNode; className?: string; contextAct?: ActId }) {
  const label = textOf(children);
  if (!label.trim()) return <span className={cn(chipCls, className)}>{children}</span>;
  return (
    <HoverPopover label={`Treść przepisu: ${label}`} width={400} className={cn(chipCls, "cursor-help gap-1 border-brand/30 text-left text-brand hover:border-brand hover:bg-brand-soft", className)} trigger={<><Scale className="h-3 w-3 shrink-0" aria-hidden />{children}</>}>
      <LegalPopover label={label} contextAct={contextAct} />
    </HoverPopover>
  );
}

/** Zwykły tekst z automatycznie podświetlonymi odwołaniami do przepisów (np. „… (art. 177 § 3 KP)”). */
export function LegalText({ children, contextAct = "zasilkowa" }: { children: string; contextAct?: ActId }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of children.matchAll(LEGAL_REF)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(children.slice(last, i));
    parts.push(
      <HoverPopover key={i} label={`Treść przepisu: ${m[0]}`} width={400} className="inline cursor-help rounded-sm font-bold text-brand underline decoration-brand/40 decoration-dotted underline-offset-[3px] hover:decoration-brand" trigger={m[0]}>
        <LegalPopover label={m[0]} contextAct={contextAct} />
      </HoverPopover>,
    );
    last = i + m[0].length;
  }
  if (!parts.length) return <>{children}</>;
  if (last < children.length) parts.push(children.slice(last));
  return <>{parts}</>;
}

/** Jeśli treść jest tekstem – podświetl w niej przepisy; w przeciwnym razie wyrenderuj bez zmian. Działa też w komponentach serwerowych. */
export function Legalized({ children }: { children?: React.ReactNode }) {
  return typeof children === "string" ? <LegalText>{children}</LegalText> : <>{children}</>;
}

export const toneText: Record<Tone, string> = { blue: "text-blue", green: "text-green", orange: "text-orange", gold: "text-gold", red: "text-red", neutral: "text-fg-2" };
export const toneBg: Record<Tone, string> = tones;
