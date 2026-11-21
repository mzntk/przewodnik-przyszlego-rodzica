"use client";
import { motion } from "framer-motion";
import type { BaseCalculation, BenefitSegment, CalculationResult } from "@/models/types";
import { LegalChip, LegalText } from "@/components/ui/badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { KIND_STYLE } from "@/components/dashboard/benefit-gantt";
import { Term } from "@/components/ui/term";
import { cn, dShort, pct, zl, zl0 } from "@/lib/utils";

export function SummaryCard({ result, loading }: { result: CalculationResult; loading: boolean }) {
  const elig = result.mother.eligibility;
  const kos = result.familyBenefits.find((b) => b.id === "kosiniakowe");
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5 transition-opacity", loading && "opacity-70")}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">Łącznie dla rodziny</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[13px] font-semibold", elig.insured ? "bg-green-soft text-green" : "bg-red-soft text-red")}>{elig.insured ? "ubezpieczona" : "brak ubezpieczenia"}</span>
      </div>
      <div className="num mt-1 text-[34px] leading-tight font-semibold tracking-tight">
        <AnimatedNumber value={elig.insured ? result.totals.family : (kos?.total ?? 0)} format={zl0} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[14px]">
        <div>
          <div className="text-muted">Mama</div>
          <div className="num font-semibold"><AnimatedNumber value={result.totals.mother} format={zl0} /></div>
        </div>
        <div>
          <div className="text-muted">Tata</div>
          <div className="num font-semibold"><AnimatedNumber value={result.totals.father} format={zl0} /></div>
        </div>
        <div>
          <div className="text-muted">Pierwszy miesiąc</div>
          <div className="num font-semibold text-gold"><AnimatedNumber value={result.totals.monthlyMotherFirst} format={zl0} /></div>
        </div>
        <div>
          <div className="text-muted"><Term id="platnik">Płatnik</Term></div>
          <div className="font-semibold text-blue">{elig.payer.payer === "zus" ? "ZUS" : "Pracodawca"}</div>
        </div>
      </div>
      {elig.debtBlock.blocked && <div className="mt-3 rounded-xl bg-red-soft px-3 py-2 text-[13px] text-red">Wypłata zablokowana – zadłużenie {zl(elig.debtBlock.debt)} <LegalText>(art. 2a)</LegalText></div>}
      <div className="mt-3 text-[12px] text-muted">Konfiguracja: {result.configVersion} · kwoty brutto, przed zaliczką PIT</div>
    </div>
  );
}

export function SegmentTable({ segments, compact }: { segments: BenefitSegment[]; compact?: boolean }) {
  if (!segments.length) return <p className="text-[15px] text-muted">Brak okresów do wypłaty.</p>;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[14px]">
        <thead className="text-[13px] text-muted uppercase">
          <tr>
            <th className="px-1 py-2 font-medium">Świadczenie</th>
            <th className="px-1 py-2 font-medium">Okres</th>
            <th className="px-1 py-2 text-right font-medium">Dni</th>
            <th className="px-1 py-2 text-right font-medium">Stawka</th>
            <th className="px-1 py-2 text-right font-medium">Miesięcznie</th>
            <th className="px-1 py-2 text-right font-medium">Razem</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((s, i) => (
            <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-t border-line align-top">
              <td className="px-1 py-2.5">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-sm", KIND_STYLE[s.kind].bar)} />
                  <div>
                    <div className="font-medium"><Term id={KIND_STYLE[s.kind].glossary}>{s.label}</Term></div>
                    <div className="text-[13px] text-muted">
                      {s.who === "matka" ? "mama" : "tata"} · {s.payer}
                      {s.raisedToParentalBenefit && <span className="text-gold"> · podwyższony do 1000 zł</span>}
                    </div>
                    {!compact && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.legal.map((l) => (
                          <LegalChip key={l.article}>{l.article}</LegalChip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="num px-1 py-2.5 whitespace-nowrap text-fg-2">
                {dShort(s.from)}
                <br />
                {dShort(s.to)}
              </td>
              <td className="num px-1 py-2.5 text-right">{s.days}</td>
              <td className="num px-1 py-2.5 text-right">
                {pct(s.rate)}
                {s.workReduction ? <div className="text-[12px] text-muted">−{pct(s.workReduction)} praca</div> : null}
              </td>
              <td className="num px-1 py-2.5 text-right">{zl(s.monthlyAmount)}</td>
              <td className="num px-1 py-2.5 text-right font-semibold">{zl(s.total)}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BaseSteps({ base }: { base: BaseCalculation }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold">{base.methodLabel}</span>
        {base.legal.map((l) => (
          <LegalChip key={l.article}>{l.article}</LegalChip>
        ))}
      </div>
      <ol className="space-y-1">
        {base.steps.map((s, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }} className={cn("flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-[14px]", s.value === "wyłączony" ? "text-muted line-through" : "odd:bg-surface-2/60")}>
            <span>
              {s.label}
              {s.note && <span className="ml-1.5 text-[13px] text-muted">({s.note})</span>}
            </span>
            <span className="num shrink-0 font-medium">{typeof s.value === "number" ? zl(s.value) : s.value}</span>
          </motion.li>
        ))}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-blue-soft px-4 py-3">
          <div className="text-[13px] text-blue">Podstawa wymiaru (miesięczna)</div>
          <div className="num text-xl font-semibold text-blue">{zl(base.base)}</div>
        </div>
        <div className="rounded-xl bg-surface-2 px-4 py-3">
          <div className="text-[13px] text-muted">Stawka dzienna (1/30)</div>
          <div className="num text-xl font-semibold">{zl(base.dailyBase)}</div>
        </div>
      </div>
      {(base.minimumApplied || base.capApplied) && (
        <p className="mt-2 text-[13px] text-gold"><LegalText>{base.minimumApplied ? "Zastosowano gwarancję minimalnej podstawy (art. 45)." : "Zastosowano limit podstawy dla ubezpieczenia dobrowolnego."}</LegalText></p>
      )}
    </div>
  );
}
