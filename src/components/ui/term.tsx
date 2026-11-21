"use client";
import { Info } from "lucide-react";
import { GLOSSARY, type GlossaryId } from "@/data/glossary";
import { cn } from "@/lib/utils";
import { HoverPopover } from "./info-tip";

/**
 * „Trudne” pojęcie ze słownika: tekst + ikonka ⓘ. Wyjaśnienie po najechaniu, focusie lub dotknięciu.
 */
export function Term({ id, children, className }: { id: GlossaryId; children?: React.ReactNode; className?: string }) {
  const g = GLOSSARY[id];
  return (
    <HoverPopover
      label={`${g.term} – wyjaśnienie`}
      className={cn("inline cursor-help rounded-sm text-left underline decoration-current/30 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-current", className)}
      trigger={
        <>
          {children ?? g.term}
          <Info className="ml-0.5 inline h-3.5 w-3.5 align-[-2px] text-brand" strokeWidth={2.4} aria-hidden />
        </>
      }
    >
      <div className="text-[15px] font-bold text-fg">{g.term}</div>
      <dl className="mt-2 space-y-2 text-[14px] leading-snug">
        <div>
          <dt className="font-bold text-fg-2">Co to jest?</dt>
          <dd className="text-fg-2">{g.what}</dd>
        </div>
        <div>
          <dt className="font-bold text-fg-2">Dla kogo?</dt>
          <dd className="text-fg-2">{g.who}</dd>
        </div>
      </dl>
    </HoverPopover>
  );
}
