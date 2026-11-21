"use client";
import { motion } from "framer-motion";
import type { BenefitSegment } from "@/models/types";
import { cn, dShort, zl } from "@/lib/utils";
import { Term } from "@/components/ui/term";
import type { GlossaryId } from "@/data/glossary";

export const KIND_STYLE: Record<BenefitSegment["kind"], { bar: string; dot: string; label: string; glossary: GlossaryId }> = {
  wynagrodzenie_chorobowe: { bar: "bg-orange/70", dot: "bg-orange", label: "Wynagrodzenie chorobowe", glossary: "wynagrodzenie-chorobowe" },
  chorobowy: { bar: "bg-orange", dot: "bg-orange", label: "Zasiłek chorobowy", glossary: "zasilek-chorobowy" },
  rehabilitacyjne: { bar: "bg-orange/50", dot: "bg-orange", label: "Świadczenie rehabilitacyjne", glossary: "rehabilitacyjne" },
  w_wysokosci_macierzynskiego: { bar: "bg-blue/60", dot: "bg-blue", label: "W wysokości macierzyńskiego", glossary: "zasilek-macierzynski" },
  macierzynski: { bar: "bg-blue", dot: "bg-blue", label: "Macierzyński", glossary: "urlop-macierzynski" },
  uzupelniajacy: { bar: "bg-gold", dot: "bg-gold", label: "Uzupełniający", glossary: "uzupelniajacy" },
  rodzicielski: { bar: "bg-green", dot: "bg-green", label: "Rodzicielski", glossary: "rodzicielski" },
  rodzicielski_niezbywalny: { bar: "bg-green/60", dot: "bg-green", label: "Rodzicielski – 9 tyg. niezbywalne", glossary: "9-tygodni" },
  rodzicielski_praca: { bar: "bg-[repeating-linear-gradient(45deg,var(--green)_0_6px,color-mix(in_oklab,var(--green)_45%,transparent)_6px_12px)]", dot: "bg-green", label: "Rodzicielski + praca", glossary: "rodzicielski" },
  ojcowski: { bar: "bg-[#a78bfa]", dot: "bg-[#a78bfa]", label: "Ojcowski", glossary: "ojcowski" },
  opiekunczy: { bar: "bg-fg-2", dot: "bg-fg-2", label: "Opiekuńczy", glossary: "opiekunczy" },
  kosiniakowe: { bar: "bg-gold/60", dot: "bg-gold", label: "Świadczenie rodzicielskie", glossary: "kosiniakowe" },
};

export function BenefitGantt({ segments, start, end, today, event, names }: { segments: BenefitSegment[]; start: string; end: string; today: string; event: string; names: { matka: string; ojciec?: string } }) {
  const s = Date.parse(start);
  const e = Date.parse(end) + 86400000;
  const span = Math.max(1, e - s);
  const pos = (iso: string) => Math.min(100, Math.max(0, ((Date.parse(iso) - s) / span) * 100));
  const rows: ("matka" | "ojciec")[] = names.ojciec && segments.some((x) => x.who === "ojciec") ? ["matka", "ojciec"] : ["matka"];
  // znaczniki miesięcy
  const ticks: string[] = [];
  const d = new Date(s);
  d.setUTCDate(1);
  while (d.getTime() < e) {
    d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() < e) ticks.push(d.toISOString().slice(0, 10));
  }
  const step = Math.ceil(ticks.length / 8);
  const kinds = [...new Set(segments.map((x) => x.kind))];

  return (
    <div>
      <div className="relative">
        <div className="relative ml-16 h-5 text-[12px] text-muted sm:ml-20">
          {ticks.filter((_, i) => i % step === 0).map((t) => (
            <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(t)}%` }}>
              {t.slice(5, 7)}/{t.slice(2, 4)}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <div className="w-14 shrink-0 truncate text-[13px] font-medium text-fg-2 sm:w-[72px]">{r === "matka" ? names.matka : names.ojciec}</div>
              <div className="relative h-9 flex-1 overflow-hidden rounded-xl bg-surface-2">
                {segments
                  .filter((x) => x.who === r)
                  .map((x, i) => (
                    <motion.div
                      key={x.id}
                      initial={{ scaleX: 0, opacity: 0 }}
                      animate={{ scaleX: 1, opacity: 1 }}
                      transition={{ delay: 0.05 * i, type: "spring", stiffness: 160, damping: 24 }}
                      style={{ left: `${pos(x.from)}%`, width: `${Math.max(0.6, pos(x.to) - pos(x.from) + (86400000 / span) * 100)}%`, transformOrigin: "left" }}
                      className={cn("group absolute top-1 bottom-1 rounded-lg", KIND_STYLE[x.kind].bar)}
                      title={`${x.label}\n${dShort(x.from)} – ${dShort(x.to)} (${x.days} dni)\n${zl(x.monthlyAmount)}/mies. · razem ${zl(x.total)}`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
        {/* linie: dziś i poród */}
        <div className="pointer-events-none absolute top-5 bottom-0 left-16 right-0 sm:left-[88px]">
          <div className="absolute top-0 bottom-0 w-px bg-fg" style={{ left: `${pos(today)}%` }}>
            <span className="absolute -top-4 -translate-x-1/2 rounded bg-fg px-1 text-[11px] font-semibold text-bg">dziś</span>
          </div>
          <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-gold" style={{ left: `${pos(event)}%` }} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {kinds.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[13px] text-muted">
            <span className={cn("h-2.5 w-2.5 rounded-sm", KIND_STYLE[k].bar)} /> <Term id={KIND_STYLE[k].glossary}>{KIND_STYLE[k].label}</Term>
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <span className="h-2.5 w-px border-l border-dashed border-gold" /> poród / przyjęcie
        </span>
      </div>
    </div>
  );
}
