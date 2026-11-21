"use client";
import { ChevronDown, ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { Term } from "@/components/ui/term";
import { CaseRow, caseStatus, useCases } from "@/components/cases/case-ui";
import { GUIDES } from "@/data/documents";
import type { CaseStatus } from "@/models/case-status";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; statuses: CaseStatus[]; empty: string }[] = [
  { title: "Do zrobienia", statuses: ["niezlozony", "uzupelnienie"], empty: "Nic nie czeka na Twój ruch." },
  { title: "W toku", statuses: ["zarejestrowany", "weryfikacja"], empty: "Brak spraw w trakcie rozpatrywania." },
  { title: "Załatwione", statuses: ["przyznany"], empty: "Jeszcze żadna sprawa nie została zakończona." },
];

/** Moje sprawy: wnioski i dokumenty ze statusem z ZUS. Instrukcje otwierają się po kliknięciu sprawy. */
export function Applications() {
  const { cases, casesSyncedAt, openCase } = useApp();
  const { result } = useCalculation();
  const { items, ready } = useCases();
  const [why, setWhy] = useState(false);
  const [others, setOthers] = useState(false);

  if (!ready || !result) return <Skeleton className="h-96" />;
  const e = result.mother.eligibility;
  const mine = new Set(items.map((i) => i.guide.id));
  const otherGuides = Object.values(GUIDES).filter((g) => !mine.has(g.id));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Moje sprawy"
        description="Wnioski i dokumenty, które dotyczą Twojej sytuacji. Statusy pobieramy z ZUS automatycznie – kliknij sprawę, żeby zobaczyć, jak ją załatwić."
        actions={
          casesSyncedAt ? (
            <span className="flex items-center gap-1.5 text-[14px] text-muted">
              <RefreshCw className="h-4 w-4" /> zsynchronizowano o {new Date(casesSyncedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null
        }
      />

      <section className="rounded-2xl border border-line bg-surface px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[16px]">
            Twój zasiłek wypłaca <b>{e.payer.payer === "zus" ? "ZUS" : "pracodawca"}</b> – <Term id="platnik">dlaczego?</Term>
          </p>
          <button onClick={() => setWhy((v) => !v)} className="flex items-center gap-1 text-[15px] font-bold text-brand" aria-expanded={why}>
            Gdzie składać dokumenty <ChevronDown className={cn("h-4 w-4 transition-transform", why && "rotate-180")} />
          </button>
        </div>
        {why && (
          <div className="mt-3 space-y-2 border-t border-line pt-3 text-[15px] text-fg-2">
            <p>{e.payer.reason}</p>
            <p className="font-bold text-fg">{e.payer.submitTo}</p>
            {e.payer.payer === "zus" && (
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> Nie dołączasz odpisu aktu urodzenia – ZUS pobierze dane z rejestru stanu cywilnego.
              </p>
            )}
          </div>
        )}
      </section>

      {GROUPS.map((group) => {
        const list = items.filter((i) => group.statuses.includes(caseStatus(cases, i.guide.id)));
        return (
          <section key={group.title}>
            <h2 className="text-[19px] font-bold">
              {group.title} <span className="font-normal text-muted">{list.length}</span>
            </h2>
            {list.length ? (
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {list.map((i) => (
                  <li key={i.guide.id} className="p-1">
                    <CaseRow item={i} onOpen={() => openCase(i.guide.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-muted">{group.empty}</p>
            )}
          </section>
        );
      })}

      <section className="border-t border-line pt-6">
        <button onClick={() => setOthers((v) => !v)} className="flex items-center gap-1 text-[16px] font-bold text-fg-2" aria-expanded={others}>
          Inne druki i wzory ({otherGuides.length}) <ChevronDown className={cn("h-4 w-4 transition-transform", others && "rotate-180")} />
        </button>
        {others && (
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {otherGuides.map((g) => (
              <li key={g.id} className="text-[15px] text-fg-2">
                <span className="font-bold">{g.glossary ? <Term id={g.glossary}>{g.code}</Term> : g.code}</span> – {g.name}
              </li>
            ))}
          </ul>
        )}
        <a href="https://www.zus.pl" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold text-brand hover:underline">
          Wzory formularzy na zus.pl <ExternalLink className="h-4 w-4" />
        </a>
      </section>
    </div>
  );
}
