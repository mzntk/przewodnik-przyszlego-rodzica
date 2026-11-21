"use client";
import { motion } from "framer-motion";
import type { Deadline } from "@/models/types";
import { Badge, LegalChip } from "@/components/ui/badge";
import { cn, dShort, plural } from "@/lib/utils";

const DOT = { info: "bg-blue", success: "bg-green", warning: "bg-orange", danger: "bg-red", gold: "bg-gold" } as const;

export function DeadlineTimeline({ deadlines, filter }: { deadlines: Deadline[]; filter?: (d: Deadline) => boolean }) {
  const items = filter ? deadlines.filter(filter) : deadlines;
  return (
    <ol className="relative space-y-1 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-line">
      {items.map((d, i) => {
        const past = d.daysLeft < 0;
        const urgent = !past && d.daysLeft <= 14;
        return (
          <motion.li key={d.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="relative flex gap-4 py-2.5 pl-0">
            <span className={cn("relative z-10 mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-[3px] border-bg", past ? "bg-surface-3" : DOT[d.severity])} />
            <div className={cn("min-w-0 flex-1", past && "opacity-55")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold">{d.title}</span>
                {past ? (
                  <Badge>minął {dShort(d.date)}</Badge>
                ) : (
                  <Badge tone={urgent ? "orange" : d.severity === "danger" ? "red" : d.severity === "gold" ? "gold" : "blue"}>
                    {d.daysLeft === 0 ? "dziś" : `za ${d.daysLeft} ${plural(d.daysLeft, "dzień", "dni", "dni")}`} · {dShort(d.date)}
                  </Badge>
                )}
                {d.who !== "oboje" && <span className="text-[13px] text-muted">{d.who === "ojciec" ? "zadanie taty" : "zadanie mamy"}</span>}
              </div>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{d.description}</p>
              {d.windowStart && <p className="mt-1 text-[13px] text-fg-2">Najwcześniejszy start urlopu: {dShort(d.windowStart)}</p>}
              {d.legal && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {d.legal.map((l) => (
                    <LegalChip key={l.article}>
                      {l.article} {l.act}
                    </LegalChip>
                  ))}
                </div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
