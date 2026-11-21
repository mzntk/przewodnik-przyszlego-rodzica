"use client";
import { Legalized } from "./badge";
import { Drawer } from "vaul";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useIsDesktop() {
  const [d, setD] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const f = () => setD(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return d;
}

/** Vaul-style drawer: na mobile wysuwany od dołu, na desktopie panel z prawej. */
export function Sheet({ open, onOpenChange, title, description, children, className, wide }: { open: boolean; onOpenChange: (v: boolean) => void; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; wide?: boolean }) {
  const desktop = useIsDesktop();
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={desktop ? "right" : "bottom"}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50-[2px]" />
        <Drawer.Content
          className={cn(
            "fixed z-50 flex flex-col border-line bg-bg-elevated outline-none",
            desktop ? cn("top-2 right-2 bottom-2 rounded-2xl border", wide ? "w-[min(760px,calc(100vw-1rem))]" : "w-[min(520px,calc(100vw-1rem))]") : "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl border-t",
            className,
          )}
        >
          {!desktop && <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-surface-3" />}
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 sm:px-6 sm:pt-6">
            <div>
              <Drawer.Title className="text-lg font-semibold tracking-tight">{title}</Drawer.Title>
              {description && <Drawer.Description className="mt-1 text-sm text-muted"><Legalized>{description}</Legalized></Drawer.Description>}
            </div>
            <button onClick={() => onOpenChange(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg" aria-label="Zamknij">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
