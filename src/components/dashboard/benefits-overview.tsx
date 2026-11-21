"use client";
import { motion } from "framer-motion";
import { ArrowRight, Baby, CalendarRange, FileSearch, FileSignature, HeartHandshake, ListChecks, ShieldAlert, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-mounted";
import { useApp } from "@/store/app";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Ring, Skeleton, Stat } from "@/components/ui/misc";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AlertsList } from "./alerts";
import { BenefitGantt } from "./benefit-gantt";
import { DeadlineTimeline } from "./deadlines";
import { cn, dLong, plural, zl, zl0 } from "@/lib/utils";
import { TITLE_LABELS } from "@/models/types";

export function BenefitsOverview() {
  const { data, account } = useApp();
  const viewAs = account === "tata" ? "tata" : "mama";
  const { result, loading } = useCalculation();
  const today = useToday();
  const event = data.child.birthDate ?? data.child.dueDate;
  const born = !!data.child.birthDate && data.child.birthDate <= today;
  const daysTo = Math.round((Date.parse(event) - Date.parse(today)) / 86400000);
  const pregWeek = Math.max(0, Math.min(42, 40 - Math.ceil(daysTo / 7)));

  if (!result) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const elig = result.mother.eligibility;
  const danger = result.findings.filter((f) => f.severity === "danger").length;
  const next = result.deadlines.find((d) => d.daysLeft >= 0);
  const firstMonthly = result.segments.find((s) => s.who === "matka" && ["macierzynski", "w_wysokosci_macierzynskiego"].includes(s.kind))?.monthlyAmount ?? 0;
  const kos = result.familyBenefits.find((b) => b.id === "kosiniakowe");

  return (
    <div className="space-y-6">
      <PageHeader
       
        title="Moje świadczenia"
        description={viewAs === "tata" ? `Świadczenia rodziny udostępnione przez ${data.mother.firstName || "mamę"}.` : `${TITLE_LABELS[data.mother.title]} · ${data.child.path === "biologiczny" ? "narodziny" : data.child.path === "adopcja" ? "adopcja" : "rodzina zastępcza"} · ${data.child.childrenCount > 1 ? `${data.child.childrenCount} dzieci` : "1 dziecko"}`}
        actions={
          <>
            <Link href="/kalkulator"><Badge tone="blue" className="h-8 px-3 text-[15px]">Kalkulator →</Badge></Link>
            {loading && <Badge>Przeliczanie…</Badge>}
          </>
        }
      />

      {danger > 0 && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-xl border border-[color-mix(in_oklab,var(--red)_35%,transparent)] bg-red-soft px-4 py-3 text-[15px] text-red">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">{danger} {plural(danger, "krytyczne ryzyko", "krytyczne ryzyka", "krytycznych ryzyk")} dla Twoich świadczeń – sprawdź Centrum Alertów.</span>
        </motion.div>
      )}

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="relative overflow-hidden xl:col-span-4">
          <CardBody className="pt-5 sm:pt-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Ring value={born ? 1 : pregWeek / 40} size={72} stroke={6} color="var(--gold)" />
                <Baby className="absolute inset-0 m-auto h-6 w-6 text-gold" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-muted">{born ? "Dziecko jest z Wami" : data.child.path === "biologiczny" ? "Do terminu porodu" : "Do przyjęcia dziecka"}</div>
                <div className="num text-[30px] leading-tight font-semibold tracking-tight">
                  {born ? `${Math.abs(daysTo)} ${plural(Math.abs(daysTo), "dzień", "dni", "dni")}` : daysTo >= 0 ? `${daysTo} ${plural(daysTo, "dzień", "dni", "dni")}` : "termin minął"}
                </div>
                <div className="text-[14px] text-fg-2">{born ? `urodzone ${dLong(event)}` : data.child.path === "biologiczny" ? `${pregWeek}. tydzień ciąży · ${dLong(event)}` : dLong(event)}</div>
              </div>
            </div>
            {next && (
              <div className="mt-5 rounded-xl bg-surface-2 px-4 py-3">
                <div className="text-[13px] font-medium text-muted">Najbliższy termin</div>
                <div className="mt-0.5 text-[15px] font-semibold">{next.title}</div>
                <div className="text-[13px] text-orange">za {next.daysLeft} {plural(next.daysLeft, "dzień", "dni", "dni")}</div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="xl:col-span-8">
          <CardHeader
            title="Twoje świadczenia w skrócie"
            subtitle="Wynik deterministycznego silnika – zawsze z podstawą prawną."
            icon={<Wallet className="h-4 w-4" />}
            action={elig.insured ? <Badge tone="green" dot>Ubezpieczona</Badge> : <Badge tone="red" dot>Brak ubezpieczenia</Badge>}
          />
          <CardBody>
            <div className="grid grid-cols-2 gap-5 xl:grid-cols-4">
              <Stat label="Ubezpieczenie chorobowe" value={elig.insured ? "TAK" : "NIE"} tone={elig.insured ? "green" : "red"} sub={elig.insured ? (elig.legal[0]?.article ?? "") + " u.s.u.s." : "→ świadczenie rodzicielskie"} />
              <Stat label="Kto wypłaca" value={elig.payer.payer === "zus" ? "ZUS" : "Pracodawca"} tone="blue" sub={`art. 61 · ${data.mother.payer?.insuredCount ?? 0} ubezp.`} />
              <Stat label={elig.insured ? "Pierwszy miesiąc" : "Świadczenie rodzicielskie"} value={<AnimatedNumber value={elig.insured ? firstMonthly : (kos?.monthly ?? 0)} format={zl0} />} tone="gold" sub={elig.insured ? "brutto / 30 dni" : "miesięcznie z MOPS"} />
              <Stat label="Łącznie dla rodziny" value={<AnimatedNumber value={elig.insured ? result.totals.family : (kos?.total ?? 0)} format={zl0} />} sub={`${result.leave.totalFamilyWeeks} tyg. urlopów`} />
            </div>
            {elig.debtBlock.blocked && (
              <div className="mt-4 rounded-xl bg-red-soft px-4 py-3 text-[15px] text-red">
                Wypłata wstrzymana do spłaty zadłużenia {zl(elig.debtBlock.debt)} (próg {zl(elig.debtBlock.threshold)}). Przedawnienie prawa: {dLong(elig.debtBlock.expiresOn)}.
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-line px-4 py-3 text-[14px] text-fg-2">
              {elig.insured ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red" />}
              <span>
                <b>{elig.insuredLabel}.</b> {elig.payer.reason}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Oś czasu świadczeń" subtitle="Okresy zasiłków i urlopów obojga rodziców – najedź na pasek, aby zobaczyć kwoty." icon={<CalendarRange className="h-4 w-4" />} action={<Link href="/kalkulator?tab=podzial" className="text-[14px] font-medium text-blue">Zmień plan →</Link>} />
        <CardBody>
          {result.segments.length ? (
            <BenefitGantt segments={result.segments} start={result.timelineStart} end={result.timelineEnd} today={today} event={event} names={{ matka: data.mother.firstName || "Mama", ojciec: data.father?.firstName }} />
          ) : (
            <p className="text-[15px] text-muted">Brak okresów zasiłkowych – sprawdź alerty i świadczenia rodzinne.</p>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="Terminy graniczne (hard deadlines)" subtitle="Wyliczone automatycznie od daty porodu / przyjęcia dziecka." icon={<ListChecks className="h-4 w-4" />} />
          <CardBody>
            <DeadlineTimeline deadlines={result.deadlines} filter={viewAs === "tata" ? (d) => d.who !== "matka" : undefined} />
          </CardBody>
        </Card>
        <div className="space-y-4 xl:col-span-5">
          <Card>
            <CardHeader title="Centrum Alertów i Red Flags" subtitle="Ryzyka utraty lub obniżenia świadczeń" icon={<ShieldAlert className="h-4 w-4" />} action={<Badge tone={danger ? "red" : "neutral"}>{result.findings.length}</Badge>} />
            <CardBody>
              <AlertsList findings={result.findings} />
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/dokumenty", icon: FileSearch, title: "Sprawdź dokument PDF", text: "Walidacja braków formalnych", tone: "text-gold" },
          { href: "/wnioski", icon: FileSignature, title: "Przygotuj wnioski", text: "Autouzupełnianie i eksport PDF", tone: "text-blue" },
          { href: "/ustawienia#partner", icon: HeartHandshake, title: "Dostęp dla partnera", text: "Co widzi tata po zalogowaniu", tone: "text-green" },
        ].map((q) => (
          <Link key={q.href} href={q.href} className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <q.icon className={cn("h-5 w-5", q.tone)} />
            <div className="flex-1">
              <div className="text-[16px] font-semibold">{q.title}</div>
              <div className="text-[14px] text-muted">{q.text}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
