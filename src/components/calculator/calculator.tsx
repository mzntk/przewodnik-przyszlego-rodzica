"use client";
import { LegalText } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Baby, Briefcase, Calculator as CalcIcon, Coins, HandHeart, HeartPulse, Scale, Split, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useApp, type CaseData } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-mounted";
import { MotionTabs } from "@/components/ui/tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, Ring, Skeleton, Stat } from "@/components/ui/misc";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Field, Input, NumberInput, Select, Slider, Switch, Segmented } from "@/components/ui/form";
import { ChildEditor, LOSS_HINT, LOSS_INFO, ParentEditor, SickLeaveEditor } from "@/components/forms/case-editors";
import { BaseSteps, SegmentTable, SummaryCard } from "./results";
import { BenefitGantt } from "@/components/dashboard/benefit-gantt";
import { AlertsList } from "@/components/dashboard/alerts";
import { monthlyCashflow } from "@/lib/cashflow";
import { cn, dShort, pct, zl, zl0 } from "@/lib/utils";
import type { CalculationResult } from "@/models/types";
import type { GlossaryId } from "@/data/glossary";
import { Term } from "@/components/ui/term";

const FAMILY_TERM = { "800plus": "800plus", becikowe: "becikowe", aktywny_rodzic: "aktywny-rodzic", kosiniakowe: "kosiniakowe" } as const satisfies Record<string, GlossaryId>;

const TABS = [
  { id: "ciaza", label: "Ciąża i L4", icon: <HeartPulse className="h-4 w-4" /> },
  { id: "podstawa", label: "Podstawa", icon: <CalcIcon className="h-4 w-4" /> },
  { id: "urlopy", label: "Urlopy", icon: <Baby className="h-4 w-4" /> },
  { id: "podzial", label: "Podział i praca", icon: <Split className="h-4 w-4" /> },
  { id: "warianty", label: "81,5% vs 100/70", icon: <Scale className="h-4 w-4" /> },
  { id: "opiekunczy", label: "Opiekuńczy", icon: <HandHeart className="h-4 w-4" /> },
  { id: "rodzinne", label: "Świadczenia rodzinne", icon: <Coins className="h-4 w-4" /> },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function Calculator() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "urlopy") as TabId;
  const { result, loading } = useCalculation();

  return (
    <div className="space-y-5">
      <PageHeader title="Zintegrowany kalkulator zasiłków i urlopów" description="Wszystkie scenariusze w jednym miejscu: ciąża, podstawa wymiaru, urlopy, podział między rodziców, łączenie z pracą, adopcja, opieka i świadczenia rodzinne. Każda zmiana przelicza wynik w czasie rzeczywistym." />
      <MotionTabs tabs={TABS as unknown as { id: TabId; label: string; icon: React.ReactNode }[]} value={tab} onChange={(t) => router.replace(`/kalkulator?tab=${t}`, { scroll: false })} layoutId="calc-tab" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
              {!result ? (
                <Skeleton className="h-96" />
              ) : tab === "ciaza" ? (
                <PregnancyTab r={result} />
              ) : tab === "podstawa" ? (
                <BaseTab r={result} />
              ) : tab === "urlopy" ? (
                <LeaveTab r={result} />
              ) : tab === "podzial" ? (
                <SplitTab r={result} />
              ) : tab === "warianty" ? (
                <VariantsTab r={result} />
              ) : tab === "opiekunczy" ? (
                <CareTab r={result} />
              ) : (
                <FamilyTab r={result} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="grid gap-4 md:grid-cols-2 xl:sticky xl:top-20 xl:block xl:space-y-4 xl:self-start">
          {result ? <SummaryCard result={result} loading={loading} /> : <Skeleton className="h-56" />}
          {result && (
            <Card>
              <CardHeader title="Najważniejsze ostrzeżenia" />
              <CardBody>
                <AlertsList findings={result.findings.filter((f) => f.severity !== "info")} limit={4} />
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------ A. Ciąża ------------------------------ */
function PregnancyTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const s = r.mother.sickness;
  const wp = r.mother.eligibility.waitingPeriod;
  const ex = data.mother.waitingExceptions ?? {};
  const setEx = (k: keyof typeof ex, v: boolean) => setData((d) => ((d.mother.waitingExceptions = { ...d.mother.waitingExceptions, [k]: v }), d));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Zwolnienia lekarskie (e-ZLA)" subtitle="Kod „B” = ciąża → 100% podstawy. Zwolnienie z kodem B po przerwie resetuje licznik 270 dni." icon={<HeartPulse className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <SickLeaveEditor />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-line p-3">
              <div className="text-[13px] font-semibold text-muted uppercase"><LegalText>Wyjątki od okresu wyczekiwania (art. 4 ust. 3)</LegalText></div>
              <Switch checked={!!ex.graduate} onCheckedChange={(v) => setEx("graduate", v)} label="Absolwent (zgłoszenie do 90 dni po szkole)" />
              <Switch checked={!!ex.tenYearsMandatory} onCheckedChange={(v) => setEx("tenYearsMandatory", v)} label="10 lat obowiązkowego ubezpieczenia" />
              <Switch checked={!!ex.commutingAccident} onCheckedChange={(v) => setEx("commutingAccident", v)} label="Wypadek w drodze do/z pracy" />
            </div>
            <div className="space-y-3 rounded-xl border border-line p-3">
              <div className="text-[13px] font-semibold text-muted uppercase">Sytuacja zawodowa</div>
              <Switch checked={!!data.mother.age50plus} onCheckedChange={(v) => setData((d) => ((d.mother.age50plus = v), d))} label="Pracownik po 50. roku życia" description="Pracodawca płaci 14 zamiast 33 dni" />
              <Field label="Utrata pracy w ciąży" info={LOSS_INFO} hint={LOSS_HINT[data.mother.employmentLossReason ?? "brak"]}>
                <Select
                  value={data.mother.employmentLossReason ?? "brak"}
                  onChange={(v) => setData((d) => ((d.mother.employmentLossReason = v === "brak" ? null : (v as never)), d))}
                  options={[
                    { value: "brak", label: "Nie dotyczy" },
                    { value: "upadlosc", label: "Upadłość pracodawcy" },
                    { value: "likwidacja", label: "Likwidacja pracodawcy" },
                    { value: "smierc_pracodawcy", label: "Śmierć pracodawcy" },
                    { value: "bezprawne_zwolnienie", label: "Zwolnienie niezgodne z prawem – potwierdzone wyrokiem sądu" },
                  ]}
                />
              </Field>
              {data.mother.employmentLossReason && (
                <Field label="Data rozwiązania umowy">
                  <Input type="date" value={data.mother.contractEndDate ?? ""} onChange={(e) => setData((d) => ((d.mother.contractEndDate = e.target.value), d))} />
                </Field>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Wynik: zasiłek chorobowy w ciąży" subtitle={`Podstawa: ${zl(r.mother.sicknessBase.base)} · stawka dzienna ${zl(r.mother.sicknessBase.dailyBase)}`} />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Ring value={s.periodUsed / 270} size={60} color={s.periodRemaining < 30 ? "var(--red)" : "var(--orange)"} />
                <span className="num absolute inset-0 grid place-items-center text-[13px] font-semibold">{s.periodUsed}</span>
              </div>
              <div className="text-[13px] text-muted">z 270 dni okresu zasiłkowego</div>
            </div>
            <Stat label={<Term id="wynagrodzenie-chorobowe">Pracodawca (wyn. chorobowe)</Term>} value={`${s.employerDays} dni`} sub={data.mother.title === "uop" ? `limit ${data.mother.age50plus ? 14 : 33} dni/rok` : "nie dotyczy"} />
            <Stat label="Zasiłek chorobowy" value={`${s.zusDays} dni`} tone="orange" sub={r.mother.eligibility.payer.payerLabel} />
            <Stat label="Okres wyczekiwania" value={wp.satisfied ? "spełniony" : `${wp.served}/${wp.required} dni`} tone={wp.satisfied ? "green" : "red"} sub={wp.exception ? "wyjątek – od 1. dnia" : `${wp.required} dni (${wp.required === 30 ? "obowiązkowe" : "dobrowolne"})`} />
          </div>
          {s.resetByCodeB && <div className="rounded-xl bg-green-soft px-4 py-3 text-[15px] text-green"><LegalText>Licznik okresu zasiłkowego zresetowany – zwolnienie z kodem „B” po przerwie (art. 9 ust. 2).</LegalText></div>}
          {s.waitingDaysUnpaid > 0 && <div className="rounded-xl bg-orange-soft px-4 py-3 text-[15px] text-orange">{s.waitingDaysUnpaid} dni zwolnienia przypada w okresie wyczekiwania lub bez ubezpieczenia – bez prawa do zasiłku.</div>}
          <SegmentTable segments={s.segments} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn("rounded-xl border p-4", s.rehabilitation.possible ? "border-gold/40 bg-gold-soft" : "border-line")}>
              <div className="text-[15px] font-semibold"><Term id="rehabilitacyjne" /></div>
              <p className="mt-1 text-[14px] text-fg-2">{s.rehabilitation.possible ? "Okres zasiłkowy wyczerpany – możesz wnioskować o świadczenie rehabilitacyjne." : `Dostępne po wyczerpaniu 270 dni (pozostało ${s.periodRemaining}).`} W ciąży {pct(s.rehabilitation.rate)} podstawy, do {s.rehabilitation.maxMonths} mies. ≈ <b className="num">{zl(s.rehabilitation.monthly)}</b>/mies.</p>
              <LegalChip className="mt-2">art. 18–19 ustawy zasiłkowej</LegalChip>
            </div>
            <div className={cn("rounded-xl border p-4", s.maternityLevelBenefit.applies ? "border-blue/40 bg-blue-soft" : "border-line")}>
              <div className="text-[15px] font-semibold">Zasiłek w wysokości zasiłku macierzyńskiego</div>
              <p className="mt-1 text-[14px] text-fg-2">{s.maternityLevelBenefit.reason ?? "Przysługuje przy utracie pracy w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy albo zwolnienia z pracy z naruszeniem przepisów, jeśli sąd prawomocnym wyrokiem uznał je za niezgodne z prawem."} Kwota: <b className="num">{zl(s.maternityLevelBenefit.monthly)}</b>/mies. do porodu.</p>
              <LegalChip className="mt-2">art. 30 ust. 3 ustawy zasiłkowej</LegalChip>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------ B. Podstawa ------------------------------ */
function BaseTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const m = data.mother;
  const base = r.mother.base.method === "ciaglosc" ? r.mother.sicknessBase : r.mother.base;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Dane ubezpieczeniowe" subtitle="Tytuł, okres ubezpieczenia i płatnik" icon={<Briefcase className="h-4 w-4" />} />
        <CardBody>
          <ParentEditor who="mother" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title={m.title === "uop" ? "Wynagrodzenie – 12 miesięcy" : "Podstawa / przychód – miesiące"} subtitle="Miesiąc z < 1/2 czasu pracy jest wyłączany, z ≥ 1/2 – uzupełniany do pełnego miesiąca." icon={<CalcIcon className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[460px] text-[14px]">
              <thead className="text-[13px] text-muted uppercase">
                <tr>
                  <th className="px-1 py-1.5 text-left font-medium">Miesiąc</th>
                  <th className="px-1 py-1.5 text-left font-medium">Kwota brutto</th>
                  <th className="px-1 py-1.5 text-left font-medium">Dni przepracowane</th>
                  <th className="px-1 py-1.5 text-left font-medium">Dni obowiązujące</th>
                </tr>
              </thead>
              <tbody>
                {m.incomeHistory.map((row, i) => {
                  const ratio = row.requiredDays ? (row.workedDays ?? row.requiredDays) / row.requiredDays : 1;
                  return (
                    <tr key={row.month} className={cn("border-t border-line", ratio < 0.5 && "opacity-50")}>
                      <td className="num px-1 py-1.5 font-medium">
                        {row.month} {ratio < 0.5 ? <Badge tone="red">wyłączony</Badge> : ratio < 1 ? <Badge tone="gold">uzupełniany</Badge> : null}
                      </td>
                      <td className="px-1 py-1.5"><NumberInput value={row.gross} step={100} suffix="zł" onChange={(v) => setData((d) => ((d.mother.incomeHistory[i].gross = v), d))} /></td>
                      <td className="px-1 py-1.5"><NumberInput value={row.workedDays ?? 21} onChange={(v) => setData((d) => ((d.mother.incomeHistory[i].workedDays = v), d))} /></td>
                      <td className="px-1 py-1.5"><NumberInput value={row.requiredDays ?? 21} onChange={(v) => setData((d) => ((d.mother.incomeHistory[i].requiredDays = v), d))} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {m.title === "uop" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Premie kwartalne – suma za 4 kwartały" hint="Do podstawy wchodzi 1/12 (art. 42)">
                <NumberInput value={m.quarterlyBonuses ?? 0} step={100} suffix="zł" onChange={(v) => setData((d) => ((d.mother.quarterlyBonuses = v), d))} />
              </Field>
              <Field label="Premia roczna za poprzedni rok" hint="Do podstawy wchodzi 1/12">
                <NumberInput value={m.annualBonus ?? 0} step={100} suffix="zł" onChange={(v) => setData((d) => ((d.mother.annualBonus = v), d))} />
              </Field>
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Wyliczenie krok po kroku" subtitle="Każdy krok z podstawą prawną – do weryfikacji przez urzędnika." />
        <CardBody>
          <BaseSteps base={base} />
          {r.mother.base.method === "ciaglosc" && (
            <div className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3 text-[14px] text-fg-2">
              <b><LegalText>Zasada ciągłości (art. 43):</LegalText></b> zasiłek macierzyński następuje bezpośrednio po chorobowym (przerwa &lt; 1 miesiąca) – podstawa nie jest przeliczana i wynosi {zl(r.mother.base.base)}.
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------ C. Urlopy ------------------------------ */
function LeaveTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const c = data.child;
  const L = r.leave;
  const count = Math.max(1, c.childrenCount);
  const weights = Array.from({ length: count }, (_, i) => c.birthWeightsG?.[i] ?? 3300);
  const hosp = Array.from({ length: count }, (_, i) => c.hospitalizationDays?.[i] ?? 0);
  const cards = [
    { glossary: (c.path === "biologiczny" ? "urlop-macierzynski" : "na-warunkach") as GlossaryId, label: c.path === "biologiczny" ? "Urlop macierzyński" : "Na warunkach macierzyńskiego", weeks: L.maternityWeeks, rate: "100%", tone: "blue" as const, note: c.path === "biologiczny" ? `min. ${L.maternityMinMotherWeeks} tyg. dla mamy po porodzie` : "min. 9 tyg." },
    { glossary: "uzupelniajacy" as GlossaryId, label: "Uzupełniający macierzyński", weeks: L.supplementaryWeeks, rate: "100%", tone: "gold" as const, note: "za hospitalizację dziecka" },
    { glossary: "rodzicielski" as GlossaryId, label: "Urlop rodzicielski", weeks: L.parentalWeeks, rate: "70% / 81,5%", tone: "green" as const, note: `w tym ${L.nonTransferableWeeks} tyg. niezbywalne dla każdego` },
    { glossary: "ojcowski" as GlossaryId, label: "Urlop ojcowski", weeks: 2, rate: "100%", tone: "neutral" as const, note: "do 12. miesiąca życia" },
  ];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Dziecko i sytuacja rodzinna" icon={<Baby className="h-4 w-4" />} />
        <CardBody>
          <ChildEditor />
        </CardBody>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-line bg-surface p-4">
            <div className="text-[14px] text-muted"><Term id={k.glossary}>{k.label}</Term></div>
            <div className="num mt-1 text-[28px] font-semibold tracking-tight">
              {k.weeks}
              <span className="ml-1 text-[16px] font-medium text-muted">tyg.</span>
            </div>
            <Badge tone={k.tone}>{k.rate}</Badge>
            <div className="mt-2 text-[13px] leading-snug text-muted">{k.note}</div>
          </motion.div>
        ))}
      </div>
      {L.adoptionNote && <div className="rounded-xl bg-blue-soft px-4 py-3 text-[15px] text-blue">{L.adoptionNote}</div>}
      {c.path === "biologiczny" && (
        <Card>
          <CardHeader title="Wcześniactwo i hospitalizacja noworodka" subtitle="Uzupełniający urlop macierzyński (art. 180² KP). Przy ciąży mnogiej liczy się najniższa masa i najdłuższa hospitalizacja." icon={<HeartPulse className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ukończony tydzień ciąży przy porodzie">
                <NumberInput value={c.gestationWeek ?? 40} min={20} max={43} onChange={(v) => setData((d) => ((d.child.gestationWeek = v), d))} suffix="tydz." />
              </Field>
              <Field label="Hospitalizacja rozpoczęta w dniu życia" hint="Dla porodu po 37. tyg.: między 5. a 28. dniem">
                <NumberInput value={c.hospitalizationStartDay ?? 1} min={1} max={60} onChange={(v) => setData((d) => ((d.child.hospitalizationStartDay = v), d))} />
              </Field>
            </div>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="grid grid-cols-2 gap-3 rounded-xl border border-line p-3">
                <Field label={`Dziecko ${i + 1} – masa urodzeniowa`}>
                  <NumberInput value={weights[i]} step={10} suffix="g" onChange={(v) => setData((d) => ((d.child.birthWeightsG = weights.map((w, j) => (j === i ? v : w))), d))} />
                </Field>
                <Field label="Dni w szpitalu">
                  <NumberInput value={hosp[i]} onChange={(v) => setData((d) => ((d.child.hospitalizationDays = hosp.map((h, j) => (j === i ? v : h))), d))} suffix="dni" />
                </Field>
              </div>
            ))}
            <div className={cn("rounded-xl px-4 py-3 text-[15px]", L.supplementaryWeeks ? "bg-gold-soft text-gold" : "bg-surface-2 text-muted")}>{L.supplementaryReason}</div>
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader title="Sytuacje szczególne" subtitle="Martwe urodzenie, zgon dziecka – wymiar zasiłku ustala się z urzędu." />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <Switch checked={!!c.stillbirth} onCheckedChange={(v) => setData((d) => ((d.child.stillbirth = v), d))} label="Urodzenie martwego dziecka" description="8 tyg. zasiłku 100% + zasiłek pogrzebowy (Z-12)" />
          <Field label="Data zgonu dziecka (jeśli dotyczy)" hint="Min. 7 dni od zgonu; do 8 tyg. życia – 8 tyg. od porodu">
            <Input type="date" value={c.childDeathDate ?? ""} onChange={(e) => setData((d) => ((d.child.childDeathDate = e.target.value || undefined), d))} />
          </Field>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------ D. Podział i praca ------------------------------ */
function SplitTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const p = data.plan;
  const P = r.leave.parentalWeeks;
  const nt = r.leave.nonTransferableWeeks;
  const hasFather = !!data.father;
  const today = useToday();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Podział urlopu rodzicielskiego" subtitle={`Pula: ${P} tyg. · każdy rodzic ma ${nt} tyg. wyłącznie dla siebie · maks. 5 części do końca roku, w którym dziecko kończy 6 lat`} icon={<Users className="h-4 w-4" />} />
        <CardBody className="space-y-5">
          <div>
            <div className="mb-2 flex justify-between text-[15px]">
              <span>Mama: <b className="num">{Math.min(p.motherParentalWeeks, P - nt)} tyg.</b></span>
              <span className="text-muted">maks. {P - nt}</span>
            </div>
            <Slider value={Math.min(p.motherParentalWeeks, P - nt)} min={0} max={Math.max(0, P - nt)} onChange={(v) => setData((d) => ((d.plan.motherParentalWeeks = v), (d.plan.fatherParentalWeeks = Math.min(d.plan.fatherParentalWeeks, P - v)), d))} />
          </div>
          <div className={cn(!hasFather && "pointer-events-none opacity-40")}>
            <div className="mb-2 flex justify-between text-[15px]">
              <span>Tata: <b className="num">{p.fatherParentalWeeks} tyg.</b> {p.fatherParentalWeeks < nt && hasFather && <Badge tone="gold">{nt - p.fatherParentalWeeks} tyg. przepadnie</Badge>}</span>
              <span className="text-muted">maks. {P - Math.min(p.motherParentalWeeks, P - nt)}</span>
            </div>
            <Slider tone="green" value={p.fatherParentalWeeks} min={0} max={Math.max(0, P - Math.min(p.motherParentalWeeks, P - nt))} onChange={(v) => setData((d) => ((d.plan.fatherParentalWeeks = v), d))} />
            {!hasFather && <p className="mt-2 text-[13px] text-muted">Dodaj drugiego rodzica w Profilu, aby zaplanować jego część.</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <Switch checked={p.simultaneous} onCheckedChange={(v) => setData((d) => ((d.plan.simultaneous = v), d))} label="Jednocześnie" description="Oboje na rodzicielskim w tym samym czasie (suma ≤ pula)" />
            </div>
            <div className="rounded-xl border border-line p-3">
              <Switch checked={p.paternity.enabled} onCheckedChange={(v) => setData((d) => ((d.plan.paternity.enabled = v), d))} label="Urlop ojcowski (2 tyg.)" description="100% podstawy taty" />
              {p.paternity.enabled && <Segmented className="mt-3 flex w-full" value={p.paternity.split} onChange={(v) => setData((d) => ((d.plan.paternity.split = v), d))} options={[{ value: "jednorazowo", label: "14 dni" }, { value: "2x7", label: "2 × 7 dni" }]} />}
            </div>
            <Field label="Tata przejmuje macierzyński po tygodniu" hint="Min. 14 tyg. mamy po porodzie (art. 180 § 5 KP); 0 = nie">
              <NumberInput value={p.fatherTakesMaternityAfterWeeks ?? 0} min={0} max={r.leave.maternityWeeks} onChange={(v) => setData((d) => ((d.plan.fatherTakesMaternityAfterWeeks = v || undefined), d))} suffix="tyg." />
            </Field>
            <Field label="Liczba części rodzicielskiego">
              <NumberInput value={p.parentalParts} min={1} max={8} onChange={(v) => setData((d) => ((d.plan.parentalParts = v), d))} />
            </Field>
            <Field label="Macierzyński przed porodem" hint="Maks. 6 tygodni przed przewidywaną datą">
              <NumberInput value={p.maternityStartBeforeBirthWeeks} min={0} max={6} onChange={(v) => setData((d) => ((d.plan.maternityStartBeforeBirthWeeks = Math.min(6, Math.max(0, v))), d))} suffix="tyg." />
            </Field>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Łączenie urlopu rodzicielskiego z pracą" subtitle="Do 1/2 etatu u pracodawcy udzielającego urlopu. Urlop wydłuża się proporcjonalnie (art. 182¹f KP), zasiłek maleje proporcjonalnie (art. 31 ust. 4a)." icon={<Briefcase className="h-4 w-4" />} />
        <CardBody className="space-y-4">
          <Switch checked={p.combineWithWork.enabled} onCheckedChange={(v) => setData((d) => ((d.plan.combineWithWork.enabled = v), d))} label="Chcę łączyć urlop z pracą" />
          {p.combineWithWork.enabled && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Kto łączy">
                <Segmented className="flex w-full" value={p.combineWithWork.who} onChange={(v) => setData((d) => ((d.plan.combineWithWork.who = v), d))} options={[{ value: "matka", label: "Mama" }, ...(hasFather ? [{ value: "ojciec" as const, label: "Tata" }] : [])]} />
              </Field>
              <Field label={`Wymiar pracy: ${Math.round(p.combineWithWork.fraction * 100)}% etatu`}>
                <Slider tone="gold" value={p.combineWithWork.fraction * 100} min={10} max={50} step={5} onChange={(v) => setData((d) => ((d.plan.combineWithWork.fraction = v / 100), d))} />
              </Field>
              <Field label="Przez ile tygodni urlopu">
                <NumberInput value={p.combineWithWork.weeks} min={1} max={P} onChange={(v) => setData((d) => ((d.plan.combineWithWork.weeks = v), d))} suffix="tyg." />
              </Field>
            </div>
          )}
          {p.combineWithWork.enabled && (
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gold-soft p-4 sm:grid-cols-3">
              <Stat label="Wydłużenie urlopu" value={`+${r.leave.parentalExtensionDays} dni`} tone="gold" sub={`${p.combineWithWork.weeks} tyg. × ${Math.round(p.combineWithWork.fraction * 100)}%`} />
              <Stat label="Łączny rodzicielski" value={`${r.leave.parentalExtendedWeeks} tyg.`} sub={`limit ${data.child.zaZyciem ? (data.child.childrenCount > 1 ? 134 : 130) : data.child.childrenCount > 1 ? 86 : 82} tyg.`} />
              <Stat label="Zasiłek w tym okresie" value={zl0(r.segments.find((s) => s.kind === "rodzicielski_praca")?.monthlyAmount ?? 0)} sub="mies. + wynagrodzenie za pracę" />
            </div>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Plan świadczeń" />
        <CardBody className="space-y-5">
          <BenefitGantt segments={r.segments} start={r.timelineStart} end={r.timelineEnd} today={today} event={data.child.birthDate ?? data.child.dueDate} names={{ matka: data.mother.firstName || "Mama", ojciec: data.father?.firstName }} />
          <SegmentTable segments={r.segments.filter((s) => !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind))} />
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------ E. Warianty ------------------------------ */
function VariantsTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const alt: CaseData = useMemo(() => ({ ...data, plan: { ...data.plan, variant: data.plan.variant === "combined" ? "standard" : "combined" } }), [data]);
  const { result: altR } = useCalculation(alt);
  const std = data.plan.variant === "standard" ? r : altR;
  const comb = data.plan.variant === "combined" ? r : altR;
  const v = r.variants;
  const maxTotal = Math.max(v.standard.total, v.combined.total, 1);
  const flowStd = std ? monthlyCashflow(std.segments.filter((s) => !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind)), "matka") : [];
  const flowComb = comb ? monthlyCashflow(comb.segments.filter((s) => !["wynagrodzenie_chorobowe", "chorobowy"].includes(s.kind)), "matka") : [];
  const months = [...new Set([...flowStd, ...flowComb].map((x) => x.month))].sort();
  const maxM = Math.max(1, ...flowStd.map((x) => x.amount), ...flowComb.map((x) => x.amount));
  const eqDeadline = r.deadlines.find((d) => d.id === "combined");

  if (!r.mother.eligibility.insured) return <Card><CardBody className="pt-6 text-[15px] text-muted">Porównanie wariantów dotyczy osób z prawem do zasiłku macierzyńskiego. Sprawdź zakładkę „Świadczenia rodzinne”.</CardBody></Card>;

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-fg-2">
        Wybierz sposób wypłaty: <Term id="wariant-100-70" /> albo <Term id="wariant-815" />. Kliknij kartę, aby zastosować wariant w planie.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { id: "standard" as const, title: "100% + 70%", sub: v.standard.label, total: v.standard.total, lines: [`${zl0(v.standard.monthlyFirst)}/mies. na macierzyńskim`, `${zl0(v.standard.monthlyLater)}/mies. na rodzicielskim`] },
          { id: "combined" as const, title: "81,5% za cały okres", sub: v.combined.label, total: v.combined.total, lines: [`${zl0(v.combined.monthly)}/mies. – równe przelewy`, `wyrównanie do 100%: ${zl0(v.combined.equalization)} (gdy brak rodzicielskiego w 1. roku)`] },
        ].map((x) => {
          const active = data.plan.variant === x.id;
          const best = v.recommendation === x.id;
          return (
            <motion.button key={x.id} layout onClick={() => setData((d) => ((d.plan.variant = x.id), d))} className={cn("relative rounded-2xl border p-5 text-left transition", active ? "border-line-strong bg-surface" : "border-line bg-surface/60 hover:bg-surface")}>
              {active && <motion.span layoutId="variant-ring" className="absolute inset-0 rounded-2xl ring-2 ring-blue" />}
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-semibold">{x.title}</span>
                {best && <Badge tone="gold">Korzystniej</Badge>}
              </div>
              <div className="mt-0.5 text-[13px] text-muted">{x.sub}</div>
              <div className="num mt-3 text-[30px] font-semibold tracking-tight">{zl0(x.total)}</div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
                <motion.div className={cn("h-full rounded-full", x.id === "standard" ? "bg-blue" : "bg-gold")} initial={{ width: 0 }} animate={{ width: `${(x.total / maxTotal) * 100}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
              </div>
              <ul className="mt-3 space-y-1 text-[14px] text-fg-2">
                {x.lines.map((l) => (
                  <li key={l}>• {l}</li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>
      <div className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px]">
        <b>{v.difference >= 0 ? "Różnica na korzyść 100%/70%" : "Różnica na korzyść 81,5%"}: {zl(Math.abs(v.difference))}.</b> {v.note} {eqDeadline && <span className="text-gold">Wniosek o 81,5% – do {dShort(eqDeadline.date)}.</span>}
      </div>
      <Card>
        <CardHeader title="Przepływy miesięczne mamy" subtitle="Niebieski – 100%/70%, złoty – 81,5%" />
        <CardBody>
          <div className="flex h-44 items-end gap-[3px] overflow-x-auto">
            {months.map((m) => {
              const a = flowStd.find((x) => x.month === m)?.amount ?? 0;
              const b = flowComb.find((x) => x.month === m)?.amount ?? 0;
              return (
                <div key={m} className="flex h-full min-w-[18px] flex-1 flex-col justify-end" title={`${m}\n100/70: ${zl(a)}\n81,5%: ${zl(b)}`}>
                  <div className="flex flex-1 items-end gap-[2px]">
                    <motion.div className="flex-1 rounded-t bg-blue" initial={{ height: 0 }} animate={{ height: `${(a / maxM) * 100}%` }} />
                    <motion.div className="flex-1 rounded-t bg-gold" initial={{ height: 0 }} animate={{ height: `${(b / maxM) * 100}%` }} />
                  </div>
                  <div className="mt-1 text-center text-[11px] text-muted">{m.slice(5)}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <LegalChip>art. 30a</LegalChip>
            <LegalChip>art. 31 ust. 1–4</LegalChip>
            <LegalChip>art. 31 ust. 3f – 9 tyg. drugiego rodzica 70%</LegalChip>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------ Opiekuńczy ------------------------------ */
function CareTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const c = data.care ?? { enabled: true, type: "dziecko_do_14" as const, days: 10, usedThisYear: 0 };
  const set = (fn: (x: typeof c) => void) => setData((d) => ((d.care = { ...c }), fn(d.care), (d.care.enabled = true), d));
  useEffect(() => {
    if (!data.care) setData((d) => ((d.care = { enabled: true, type: "dziecko_do_14", days: 10, usedThisYear: 0 }), d));
  }, [data.care, setData]);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={<Term id="opiekunczy" />} subtitle="80% podstawy · bez okresu wyczekiwania · limity roczne 60 / 30 / 14 dni, łącznie maks. 60" icon={<HandHeart className="h-4 w-4" />} />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field label="Opieka nad">
            <Select value={c.type} onChange={(v) => set((x) => void (x.type = v))} options={[{ value: "dziecko_do_14", label: "Dzieckiem do 14 lat (60 dni)" }, { value: "dziecko_14_18", label: "Chorym dzieckiem 14–18 lat (30 dni)" }, { value: "inny_czlonek", label: "Innym członkiem rodziny (14 dni)" }]} />
          </Field>
          <Field label="Liczba dni opieki">
            <NumberInput value={c.days} min={1} max={60} onChange={(v) => set((x) => void (x.days = v))} suffix="dni" />
          </Field>
          <Field label="Wykorzystane w tym roku">
            <NumberInput value={c.usedThisYear} min={0} max={60} onChange={(v) => set((x) => void (x.usedThisYear = v))} suffix="dni" />
          </Field>
        </CardBody>
      </Card>
      {r.care && (
        <Card>
          <CardBody className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
            <Stat label="Przysługuje" value={`${r.care.allowed} dni`} tone={r.care.allowed < r.care.days ? "orange" : "green"} sub={`z ${r.care.days} wnioskowanych`} />
            <Stat label="Stawka dzienna (80%)" value={zl(r.care.daily)} />
            <Stat label="Razem" value={zl(r.care.total)} tone="gold" />
            <Stat label="Wniosek" value={r.care.form} tone="blue" sub={r.mother.eligibility.payer.payer === "zus" ? "do ZUS" : "do pracodawcy"} />
            <p className="col-span-full text-[14px] text-muted">{r.care.note}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------ D. Świadczenia rodzinne ------------------------------ */
function FamilyTab({ r }: { r: CalculationResult }) {
  const { data, setData } = useApp();
  const f = data.family;
  const set = (fn: (x: typeof f) => void) => setData((d) => (fn(d.family), d));
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Świadczenia rodzinne (poza ubezpieczeniem chorobowym)" subtitle="800+, becikowe, Aktywny Rodzic, świadczenie rodzicielskie" icon={<Coins className="h-4 w-4" />} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Liczba osób w gospodarstwie">
            <NumberInput value={f.householdSize} min={1} max={12} onChange={(v) => set((x) => void (x.householdSize = v))} suffix="os." />
          </Field>
          <Field label="Dochód netto rodziny (mies.)">
            <NumberInput value={f.monthlyNetIncomeTotal} step={100} onChange={(v) => set((x) => void (x.monthlyNetIncomeTotal = v))} suffix="zł" />
          </Field>
          <Field label="Aktywny Rodzic – wybierz jedną opcję" className="sm:col-span-2">
            <Segmented className="flex w-full" value={f.aktywnyRodzicOption ?? "brak"} onChange={(v) => set((x) => void (x.aktywnyRodzicOption = v === "brak" ? null : (v as "praca")))} options={[{ value: "praca", label: "W pracy" }, { value: "zlobek", label: "W żłobku" }, { value: "dom", label: "W domu" }, { value: "brak", label: "Żadna" }]} />
          </Field>
          {f.aktywnyRodzicOption === "zlobek" && (
            <Field label="Opłata za żłobek (mies.)">
              <NumberInput value={f.nurseryFee ?? 0} step={50} onChange={(v) => set((x) => void (x.nurseryFee = v))} suffix="zł" />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Switch checked={f.bothParentsWorking} onCheckedChange={(v) => set((x) => void (x.bothParentsWorking = v))} label="Oboje rodzice aktywni zawodowo" />
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {r.familyBenefits.map((b, i) => (
          <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={cn("rounded-2xl border p-5", b.eligible ? (b.id === "kosiniakowe" ? "border-gold/40 bg-gold-soft" : "border-line bg-surface") : "border-dashed border-line bg-surface/50")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[16px] font-semibold"><Term id={FAMILY_TERM[b.id]}>{b.name}</Term></span>
              <Badge tone={b.eligible ? "green" : "neutral"}>{b.eligible ? "przysługuje" : "nie przysługuje"}</Badge>
            </div>
            <div className="num mt-2 text-[24px] font-semibold tracking-tight">{b.oneOff ? zl0(b.oneOff) : b.monthly ? `${zl0(b.monthly)}/mies.` : "—"}</div>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-2">{b.reason}</p>
            <div className="mt-3 text-[13px] text-muted">
              Gdzie: {b.where}
              {b.deadline && ` · termin: ${dShort(b.deadline)}`}
            </div>
            {b.conflict && <div className="mt-2 flex items-start gap-1.5 text-[14px] text-orange"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {b.conflict}</div>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
