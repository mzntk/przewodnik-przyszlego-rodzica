"use client";
import { AlertOctagon, ArrowRight, CalendarClock, ChevronRight, FileBadge, LifeBuoy, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-mounted";
import { useApp } from "@/store/app";
import { buildPriorities, type Priority } from "@/lib/priorities";
import { resolveHref } from "@/components/layout/nav";
import { PregnancyWidget } from "@/components/pregnancy/pregnancy-widget";
import { BirthPrompt } from "@/components/pregnancy/birth-sheet";
import { childNames } from "@/lib/child";
import { CaseRow, useCases } from "@/components/cases/case-ui";
import { PrebirthPlan } from "./prebirth-plan";
import { AddPartnerSheet } from "@/components/partner/add-partner";
import { Skeleton } from "@/components/ui/misc";
import { cn, dShort, plural } from "@/lib/utils";

const KIND_ICON = { alert: AlertOctagon, zaswiadczenie: FileBadge, termin: CalendarClock } as const;
const TONE = { red: "text-red bg-red-soft", orange: "text-orange bg-orange-soft", gold: "text-gold bg-gold-soft", blue: "text-blue bg-blue-soft", green: "text-green bg-green-soft" } as const;
const SHOWN = 4;

function PriorityRow({ p, onOpen }: { p: Priority; onOpen: () => void }) {
  const Icon = KIND_ICON[p.kind];
  return (
    <button onClick={onOpen} className="group flex w-full items-start gap-4 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-surface-2">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", TONE[p.tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug font-bold">{p.title}</span>
        <span className="mt-0.5 block text-[15px] leading-snug text-fg-2">{p.sub}</span>
      </span>
      {p.daysLeft !== undefined && (
        <span className="shrink-0 text-right">
          <span className={cn("num block text-[17px] font-bold", p.daysLeft <= 14 ? "text-orange" : "text-fg")}>{p.daysLeft === 0 ? "dziś" : `${p.daysLeft} ${plural(p.daysLeft, "dzień", "dni", "dni")}`}</span>
          <span className="block text-[13px] text-muted">{dShort(p.date)}</span>
        </span>
      )}
      <ChevronRight className="mt-2.5 h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}

function Priorities({ forDad }: { forDad?: boolean }) {
  const router = useRouter();
  const { data, cases, openCase, account, access } = useApp();
  const { result } = useCalculation();
  const { items } = useCases();
  const today = useToday();
  const [all, setAll] = useState(false);
  if (!result) return <Skeleton className="h-64" />;
  const list = buildPriorities(data, result, today, cases, items.map((i) => i.guide.id), forDad);
  const shown = all ? list : list.slice(0, SHOWN);
  return (
    <section aria-labelledby="na-teraz">
      <h2 id="na-teraz" className="text-[21px] font-bold">
        Na teraz
      </h2>
      {list.length === 0 ? (
        <p className="mt-3 text-[16px] text-fg-2">Nic pilnego. Damy znać, gdy zbliży się kolejny termin.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
          {shown.map((p) => (
            <li key={p.id} className="p-1">
              <PriorityRow p={p} onOpen={() => (p.caseId ? openCase(p.caseId) : router.push(resolveHref(p.href, account, access)))} />
            </li>
          ))}
        </ul>
      )}
      {list.length > SHOWN && (
        <button onClick={() => setAll((v) => !v)} className="mt-3 text-[15px] font-bold text-brand hover:underline">
          {all ? "Pokaż mniej" : `Pokaż wszystkie (${list.length})`}
        </button>
      )}
    </section>
  );
}

function CaseStatuses({ title, limit = SHOWN }: { title: string; limit?: number }) {
  const { openCase, casesSyncedAt, account, access } = useApp();
  const { items, ready } = useCases();
  if (!ready) return <Skeleton className="h-48" />;
  return (
    <section aria-labelledby="sprawy">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sprawy" className="text-[21px] font-bold">
          {title}
        </h2>
        <Link href={resolveHref("/wnioski", account, access)} className="shrink-0 text-[15px] font-bold text-brand hover:underline">
          Wszystkie ({items.length})
        </Link>
      </div>
      <p className="mt-1 text-[14px] text-muted">{casesSyncedAt ? `Statusy z ZUS · ${new Date(casesSyncedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : "Pobieranie statusów z ZUS…"}</p>
      <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
        {items.slice(0, limit).map((i) => (
          <li key={i.guide.id} className="p-1">
            <CaseRow item={i} onOpen={() => openCase(i.guide.id)} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Dashboard() {
  const account = useApp((s) => s.account);
  return account === "tata" ? <DadHome /> : <MamaHome />;
}

function MamaHome() {
  const { data, invite } = useApp();
  const [addPartner, setAddPartner] = useState(false);
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[32px] leading-tight font-black tracking-tight sm:text-[36px]">Dzień dobry{data.mother.firstName ? `, ${data.mother.firstName}` : ""}</h1>
        <p className="mt-2 text-[17px] text-fg-2">{childNames(data.child) ? `Ty i ${childNames(data.child)} – tu widzisz tylko to, co ważne dziś.` : "Tu widzisz tylko to, co ważne dziś. Szczegóły otworzysz jednym kliknięciem."}</p>
      </header>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-10">
          <Priorities />
          <PrebirthPlan />
          <CaseStatuses title="Moje sprawy w ZUS" />
        </div>
        <div className="space-y-4">
          <BirthPrompt />
          <PregnancyWidget />
          {invite && !invite.completedAt && (
            <button onClick={() => setAddPartner(true)} className="flex w-full items-center gap-4 rounded-2xl border border-gold/40 bg-gold-soft px-5 py-4 text-left">
              <UserPlus className="h-5 w-5 shrink-0 text-gold" />
              <span className="flex-1">
                <span className="block text-[16px] font-bold">Czekamy na {invite.partnerName || "partnera"}</span>
                <span className="block text-[14px] text-fg-2">{invite.joinedAt ? "Zalogował się – uzupełnia swoje dane." : "Link zaproszenia jeszcze nie został użyty. Wyślij go ponownie."}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </button>
          )}
          {!data.father && !invite && (
            <button onClick={() => setAddPartner(true)} className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-line-strong px-5 py-4 text-left transition-colors hover:bg-surface">
              <UserPlus className="h-5 w-5 shrink-0 text-brand" />
              <span className="flex-1">
                <span className="block text-[16px] font-bold">Dodaj partnera</span>
                <span className="block text-[14px] text-fg-2">Podzielcie się formalnościami po porodzie.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>
      </div>
      <AddPartnerSheet open={addPartner} onOpenChange={setAddPartner} />
    </div>
  );
}

function DadHome() {
  const { data, access } = useApp();
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-[32px] leading-tight font-black tracking-tight sm:text-[36px]">Dzień dobry{data.father?.firstName ? `, ${data.father.firstName}` : ""}</h1>
        <p className="mt-2 text-[17px] text-fg-2">Konto partnera · {data.mother.firstName} udostępnia Ci wybrane sekcje.</p>
      </header>
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-10">
          {access.formalities || access.leave ? (
            <>
              <Priorities forDad />
              <PrebirthPlan forDad />
              <CaseStatuses title="Moje sprawy" />
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong p-6 text-[16px] text-fg-2">Mama nie udostępniła jeszcze żadnych spraw. Może to zrobić w swoich ustawieniach.</p>
          )}
        </div>
        <div className="space-y-4">
          <BirthPrompt />
          {access.pregnancy && <PregnancyWidget compact />}
          <Link href="/wsparcie" className="flex items-center gap-3 rounded-2xl border border-line px-5 py-4 transition-colors hover:bg-surface">
            <LifeBuoy className="h-5 w-5 text-red" />
            <span className="flex-1 text-[16px] font-bold">Pomoc i telefony</span>
            <ArrowRight className="h-4 w-4 text-muted" />
          </Link>
        </div>
      </div>
    </div>
  );
}
