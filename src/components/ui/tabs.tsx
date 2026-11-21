"use client";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MotionTabs<T extends string>({ tabs, value, onChange, layoutId, className }: { tabs: { id: T; label: string; icon?: React.ReactNode }[]; value: T; onChange: (v: T) => void; layoutId: string; className?: string }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // przewiń aktywną zakładkę do widoku na wąskich ekranach
    const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [value]);
  return (
    <div ref={list} role="tablist" className={cn("scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1", className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn("relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-[15px] font-medium transition-colors", active ? "font-bold text-brand" : "text-muted hover:text-fg-2")}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 rounded-xl bg-brand-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
