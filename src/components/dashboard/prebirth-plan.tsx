"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Check, ChevronDown, FileText, Landmark, Paperclip, Stethoscope } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-mounted";
import { buildPrebirthPlan, type PlanItem } from "@/lib/prebirth-plan";
import { GUIDES } from "@/data/documents";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { cn, dShort, plural } from "@/lib/utils";

const TO = { pracodawca: { icon: Briefcase, label: "do pracodawcy" }, USC: { icon: Landmark, label: "w USC" }, lekarz: { icon: Stethoscope, label: "u lekarza" } } as const;

/**
 * „Przed porodem: wnioski do pracodawcy i USC” – sprawy załatwiane poza ZUS, z datą „do kiedy”,
 * instrukcją wypełnienia, załącznikami i wstępnie wypełnionym wnioskiem.
 */
export function PrebirthPlan({ forDad, className }: { forDad?: boolean; className?: string }) {
  const { data, checklists, toggleCheck, cases, openCase } = useApp();
  const { result } = useCalculation();
  const today = useToday();
  const [open, setOpen] = useState<string | null>(null);
  if (!result || today === "1970-01-01") return null;
  const items = buildPrebirthPlan(data, result).filter((i) => !forDad || i.who !== "mama");
  if (!items.length) return null;
  const done = (i: PlanItem) => !!checklists[`plan:${i.id}`] || (!!i.docId && !!cases[i.docId] && cases[i.docId].status !== "niezlozony");
  const left = items.filter((i) => !done(i)).length;

  return (
    <section aria-labelledby="przed-porodem" className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="przed-porodem" className="flex items-center gap-2 text-[21px] font-bold">
          Przed porodem: pracodawca i USC
          <InfoTip title="Sprawy poza ZUS">
            Wnioski urlopowe składasz u pracodawcy, a uznanie ojcostwa i rejestrację urodzenia – w USC. Daty liczymy od terminu porodu ({dShort(data.child.dueDate)}) i od urlopów zaplanowanych w kalkulatorze. Gdy dziecko się urodzi, terminy przeliczą się same.
          </InfoTip>
        </h2>
        <span className="text-[14px] text-muted">{left ? `${left} z ${items.length} do zrobienia` : "wszystko zrobione ✓"}</span>
      </div>
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
        {items.map((i) => {
          const isDone = done(i);
          const days = i.due ? Math.round((Date.parse(i.due) - Date.parse(today)) / 86_400_000) : undefined;
          const To = TO[i.to];
          const expanded = open === i.id;
          return (
            <li key={i.id} className="p-1">
              <div className={cn("flex items-start gap-3 rounded-xl px-3 py-3", isDone && "opacity-60")}>
                <button type="button" role="checkbox" aria-checked={isDone} aria-label={`Zrobione: ${i.title}`} onClick={() => toggleCheck(`plan:${i.id}`)} className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition", isDone ? "border-brand bg-brand text-white" : "border-line-strong hover:border-brand")}>
                  {isDone && <Check className="h-4 w-4" strokeWidth={3} />}
                </button>
                <button type="button" onClick={() => setOpen(expanded ? null : i.id)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                  <span className={cn("block text-[16px] leading-snug font-bold", isDone && "line-through")}>{i.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-fg-2">
                    <span className="inline-flex items-center gap-1">
                      <To.icon className="h-3.5 w-3.5 text-brand" /> {To.label}
                    </span>
                    <span className="text-muted">·</span>
                    <span>{i.who === "tata" ? "składa tata" : i.who === "mama" ? "składa mama" : "oboje rodzice"}</span>
                    {i.optional && <Badge>jeśli dotyczy</Badge>}
                  </span>
                  <span className="mt-1 block text-[14px] text-fg-2">{i.dueLabel}</span>
                </button>
                <span className="shrink-0 text-right">
                  {days !== undefined ? (
                    <>
                      <span className={cn("num block text-[16px] font-bold", days < 0 ? "text-red" : days <= 14 ? "text-orange" : "text-fg")}>{days < 0 ? "po terminie" : days === 0 ? "dziś" : `${days} ${plural(days, "dzień", "dni", "dni")}`}</span>
                      <span className="block text-[12px] text-muted">{dShort(i.due!)}</span>
                    </>
                  ) : (
                    <Badge tone="orange">teraz</Badge>
                  )}
                </span>
                <button type="button" onClick={() => setOpen(expanded ? null : i.id)} aria-label="Pokaż instrukcję" className="mt-1 text-muted">
                  <ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")} />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-3 px-4 pt-1 pb-4 sm:pl-12">
                      <p className="text-[15px] text-fg-2">{i.why}</p>
                      <div>
                        <div className="mb-1 text-[13px] font-bold tracking-wide text-muted uppercase">Jak wypełnić i złożyć</div>
                        <ol className="list-decimal space-y-1 pl-5 text-[15px] text-fg-2 marker:font-bold marker:text-muted">
                          {i.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      </div>
                      {i.attach.length > 0 && (
                        <p className="flex items-start gap-2 text-[14px] text-fg-2">
                          <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> <span><b>Załączniki:</b> {i.attach.join("; ")}</span>
                        </p>
                      )}
                      {i.from && <p className="text-[14px] text-fg-2">Najwcześniejszy start: <b>{dShort(i.from)}</b></p>}
                      <div className="flex flex-wrap items-center gap-2">
                        <LegalChip>{i.legal}</LegalChip>
                        {i.docId && GUIDES[i.docId] && (
                          <Button size="sm" onClick={() => openCase(i.docId!)}>
                            <FileText className="h-3.5 w-3.5" /> Wypełniony wniosek
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
