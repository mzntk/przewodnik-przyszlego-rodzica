"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Finding } from "@/models/types";
import { LegalChip } from "@/components/ui/badge";
import { SeverityIcon } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

const ORDER = { danger: 0, warning: 1, gold: 2, success: 3, info: 4 } as const;

export function AlertsList({ findings, limit }: { findings: Finding[]; limit?: number }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = [...findings].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  return (
    <div className="space-y-2">
      {shown.map((f, i) => {
        const open = expanded === f.id || f.severity === "danger";
        return (
          <motion.div key={f.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="overflow-hidden rounded-xl border border-line bg-surface">
            <button onClick={() => setExpanded(open && f.severity !== "danger" ? null : f.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
              <SeverityIcon s={f.severity} className="mt-0.5 shrink-0" />
              <span className="flex-1 text-[15px] font-medium leading-snug">{f.title}</span>
              {f.severity !== "danger" && <ChevronDown className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />}
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
                  <div className="space-y-2.5 px-4 pb-3.5 pl-11">
                    <p className="text-[15px] leading-relaxed text-fg-2">{f.message}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {f.legal?.map((l) => (
                        <LegalChip key={l.article + l.act}>
                          {l.article} {l.act}
                        </LegalChip>
                      ))}
                      {f.action && (
                        <Link href={f.action.href} className="ml-auto inline-flex items-center gap-1 text-[14px] font-medium text-blue hover:underline">
                          {f.action.label} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
