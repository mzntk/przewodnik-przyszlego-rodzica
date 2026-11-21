"use client";
import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { GLOSSARY, type GlossaryId } from "@/data/glossary";
import { cn } from "@/lib/utils";

/**
 * Pojęcie z wyjaśnieniem: otwiera się po najechaniu myszą, po focusie z klawiatury i po dotknięciu na ekranie dotykowym.
 */
export function Term({ id, children, className }: { id: GlossaryId; children?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const g = GLOSSARY[id];
  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), next ? 120 : 160);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          onFocus={(e) => e.currentTarget.matches(":focus-visible") && setOpen(true)}
          onBlur={() => setOpen(false)}
          className={cn("cursor-help rounded-sm text-left underline decoration-current/35 decoration-dotted underline-offset-[3px] transition-colors hover:decoration-current", className)}
          aria-label={`${g.term} – wyjaśnienie`}
        >
          {children ?? g.term}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-[60] w-[min(320px,calc(100vw-24px))] rounded-xl border border-line bg-white p-4 text-left shadow-card data-[state=open]:animate-[term-in_160ms_cubic-bezier(0.16,1,0.3,1)]"
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
