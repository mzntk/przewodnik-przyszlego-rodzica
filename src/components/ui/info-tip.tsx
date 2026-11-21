"use client";
import { Popover } from "radix-ui";
import { Info } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Wspólny dymek: otwiera się po najechaniu myszą, po focusie z klawiatury i po dotknięciu (telefon).
 * Używany przez ikonkę ⓘ, pojęcia ze słownika i cytaty przepisów.
 */
export function HoverPopover({ trigger, children, label, className, width = 320 }: { trigger: React.ReactNode; children: React.ReactNode; label: string; className?: string; width?: number }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hover = (next: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), next ? 120 : 180);
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
          onClick={(e) => e.stopPropagation()}
          className={className}
          aria-label={label}
        >
          {trigger}
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
          style={{ width: `min(${width}px, calc(100vw - 24px))` }}
          className="z-[70] rounded-xl border border-line bg-white p-4 text-left shadow-card data-[state=open]:animate-[term-in_160ms_cubic-bezier(0.16,1,0.3,1)]"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Ikonka „i” w kółku – po naciśnięciu wyjaśnienie. */
export function InfoTip({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <HoverPopover
      label={`Wyjaśnienie: ${title}`}
      className={cn("inline-grid h-5 w-5 shrink-0 cursor-help place-items-center rounded-full align-[-3px] text-brand transition-colors hover:bg-brand-soft", className)}
      trigger={<Info className="h-4 w-4" strokeWidth={2.2} />}
    >
      <div className="text-[15px] font-bold text-fg">{title}</div>
      <div className="mt-1.5 space-y-1.5 text-[14px] leading-snug text-fg-2">{children}</div>
    </HoverPopover>
  );
}
