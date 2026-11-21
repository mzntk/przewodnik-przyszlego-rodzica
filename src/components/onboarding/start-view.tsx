"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Baby, Check, CheckCircle2, Loader2, ShieldCheck, Sparkles, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { ChildEditor, ParentEditor, SickLeaveEditor } from "@/components/forms/case-editors";
import { ZusFetch } from "./zus-fetch";
import { ZusLogo } from "@/components/layout/app-shell";
import { useApp } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { useCalculation } from "@/hooks/use-calculation";
import { emptyCase } from "@/data/profiles";
import { cn, zl0 } from "@/lib/utils";

const STEPS = [
  { id: "dziecko", title: "Kiedy pojawi się dziecko?", sub: "Termin porodu lub przyjęcia dziecka zasila kalendarz, terminy i kalkulator.", icon: Baby },
  { id: "ubezpieczenie", title: "Twoja sytuacja ubezpieczeniowa", sub: "Uzupełniliśmy dane z ZUS – sprawdź je i popraw, jeśli coś się zmieniło.", icon: UserRound },
  { id: "partner", title: "Drugi rodzic", sub: "Krok opcjonalny – pozwoli zaplanować urlop ojcowski i 9 tygodni rodzicielskiego taty.", icon: Users },
  { id: "szczegolne", title: "Okoliczności szczególne", sub: "Zaznacz tylko to, co Cię dotyczy – resztę możesz zmienić później w profilu.", icon: Sparkles },
] as const;

const SYNC_MESSAGES = ["Łączenie z PUE/eZUS…", "Pobieranie danych o ubezpieczeniu…", "Pobieranie historii składek (12 mies.)…", "Sprawdzanie stanu rozliczeń składek…", "Pobieranie zaświadczeń e-ZLA…"];

interface SyncSummary {
  insured: boolean;
  statusLabel: string;
  payer?: string;
  ezla: number;
  debt?: { blocked: boolean; debt: number };
}

function SyncBar() {
  const { profileId, loginMethod, setZusFetched } = useApp();
  const [msg, setMsg] = useState(0);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [open, setOpen] = useState(false);
  const manual = loginMethod === "manual" || !profileId;

  useEffect(() => {
    if (manual) return;
    let alive = true;
    const iv = setInterval(() => setMsg((m) => Math.min(m + 1, SYNC_MESSAGES.length - 1)), 650);
    const t0 = Date.now();
    fetch(`/api/integrations/zus?profile=${profileId}`)
      .then((r) => r.json())
      .then((j) => {
        const wait = Math.max(0, 3200 - (Date.now() - t0));
        setTimeout(() => {
          if (!alive) return;
          setSummary({ insured: j.insurance.sicknessInsured, statusLabel: j.insurance.statusLabel, payer: j.insurance.payer?.name, ezla: j.ezla.length, debt: j.debtCertificate ? { blocked: j.debtCertificate.blocked, debt: j.debtCertificate.debt } : undefined });
          setZusFetched(true);
          clearInterval(iv);
        }, wait);
      });
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [manual, profileId, setZusFetched]);

  if (manual)
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[14px] text-muted">
        <UserRound className="h-4 w-4" /> Tryb ręczny – dane wprowadzasz samodzielnie, bez pobierania z ZUS.
      </div>
    );

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-3 px-4 py-2.5 text-[14px]">
          {summary ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue" />}
          <AnimatePresence mode="wait">
            <motion.span key={summary ? "done" : msg} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="flex-1 truncate text-fg-2">
              {summary ? "Dane z PUE/eZUS pobrane – formularz uzupełniony automatycznie" : SYNC_MESSAGES[msg]}
            </motion.span>
          </AnimatePresence>
          {summary && (
            <button onClick={() => setOpen(true)} className="shrink-0 text-[13px] font-medium text-blue hover:underline">
              Szczegóły
            </button>
          )}
        </div>
        {!summary ? (
          <motion.div className="h-0.5 bg-blue" initial={{ width: "4%" }} animate={{ width: "92%" }} transition={{ duration: 3.2, ease: "easeOut" }} />
        ) : (
          <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-2">
            <Badge tone={summary.insured ? "green" : "red"}>{summary.insured ? "Ubezpieczenie chorobowe: TAK" : "Brak ubezpieczenia chorobowego"}</Badge>
            {summary.payer && <Badge tone="blue">{summary.payer}</Badge>}
            <Badge>{summary.ezla} e-ZLA</Badge>
            {summary.debt && <Badge tone={summary.debt.blocked ? "red" : "green"}>{summary.debt.blocked ? `Zaległość ${zl0(summary.debt.debt)}` : "Brak zaległości"}</Badge>}
          </div>
        )}
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Dane pobrane z ZUS" description="Symulacja PUE/eZUS, zaświadczenia o stanie zadłużenia i e-ZLA" wide>
        <ZusFetch />
      </Sheet>
    </>
  );
}

function Preview() {
  const { result } = useCalculation();
  if (!result) return <div className="h-[92px] animate-pulse rounded-xl bg-surface-2" />;
  const e = result.mother.eligibility;
  const kos = result.familyBenefits.find((b) => b.id === "kosiniakowe");
  return (
    <div className={cn("grid grid-cols-3 gap-3 rounded-xl border p-4", e.insured ? "border-line bg-surface-2/60" : "border-[color-mix(in_oklab,var(--red)_35%,transparent)] bg-red-soft")}>
      <div>
        <div className="text-[13px] text-muted">Ubezpieczenie</div>
        <div className={cn("text-[18px] font-semibold", e.insured ? "text-green" : "text-red")}>{e.insured ? "TAK" : "NIE"}</div>
      </div>
      <div>
        <div className="text-[13px] text-muted">Wypłaca</div>
        <div className="text-[18px] font-semibold text-blue">{e.payer.payer === "zus" ? "ZUS" : "Pracodawca"}</div>
      </div>
      <div>
        <div className="text-[13px] text-muted">{e.insured ? "1. miesiąc" : "Kosiniakowe"}</div>
        <div className="num text-[18px] font-semibold text-gold">{zl0(e.insured ? result.totals.monthlyMotherFirst : (kos?.monthly ?? 0))}</div>
      </div>
    </div>
  );
}

export function StartView() {
  const mounted = useMounted();
  const router = useRouter();
  const { data, setData, completeOnboarding, account } = useApp();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  if (!mounted || account !== "mama") return null;
  const S = STEPS[step];
  const go = (n: number) => (setDir(n > step ? 1 : -1), setStep(n));
  const finish = () => {
    completeOnboarding();
    toast.success("Profil gotowy – witaj w Przewodniku!");
    router.replace("/panel");
  };
  const multi = data.child.childrenCount > 1;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pt-5 pb-10 sm:px-6">
      <div className="flex items-center justify-between">
        <ZusLogo className="h-7" priority />
        
      </div>
      <div className="mt-5">
        <SyncBar />
      </div>

      <div className="mt-7 flex items-center gap-2" aria-label={`Krok ${step + 1} z ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => i < step && go(i)} className={cn("flex-1", i < step && "cursor-pointer")} aria-label={s.title}>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
              <motion.div className="h-full rounded-full bg-blue" animate={{ width: i <= step ? "100%" : "0%" }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-2 text-[13px] text-muted">
        Krok {step + 1} z {STEPS.length} · konfiguracja profilu
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.section key={S.id} custom={dir} initial={{ opacity: 0, x: 28 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 * dir }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="mt-6 flex-1">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-2">
              <S.icon className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-[24px] leading-tight font-semibold tracking-tight sm:text-[28px]">{S.title}</h1>
              <p className="mt-1 text-[16px] text-muted">{S.sub}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
            {S.id === "dziecko" && <ChildEditor />}
            {S.id === "ubezpieczenie" && <ParentEditor who="mother" />}
            {S.id === "partner" && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Drugi rodzic">
                  {[
                    { on: true, title: "Dodaj partnera teraz", text: "Policzymy jego urlop i podzielicie się formalnościami." },
                    { on: false, title: "Pominę – dodam później", text: "Partnera dodasz w każdej chwili w Ustawieniach lub na pulpicie." },
                  ].map((o) => {
                    const active = !!data.father === o.on;
                    return (
                      <button
                        key={o.title}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          o.on
                            ? !data.father && setData((d) => ((d.father = { ...emptyCase().mother, role: "ojciec", firstName: "Partner", lastName: d.mother.lastName, payer: { name: "", nip: "", insuredCount: 50 } }), d))
                            : (setData((d) => (delete d.father, d)), go(step + 1))
                        }
                        className={cn("rounded-xl border p-4 text-left transition-colors", active ? "border-brand bg-green-soft" : "border-line hover:bg-surface")}
                      >
                        <span className="block text-[16px] font-bold">{o.title}</span>
                        <span className="mt-1 block text-[14px] text-fg-2">{o.text}</span>
                      </button>
                    );
                  })}
                </div>
                {data.father && <ParentEditor who="father" />}
              </div>
            )}
            {S.id === "szczegolne" && (
              <div className="space-y-4">
                <Switch checked={multi} onCheckedChange={(v) => setData((d) => ((d.child.childrenCount = v ? Math.max(2, d.child.childrenCount) : 1), d))} label="Ciąża mnoga" description={multi ? `${data.child.childrenCount} dzieci – macierzyński ${[20, 31, 33, 35, 37][Math.min(data.child.childrenCount, 5) - 1]} tyg.` : "Dłuższy urlop macierzyński i rodzicielski"} />
                <Switch checked={data.child.zaZyciem} onCheckedChange={(v) => setData((d) => ((d.child.zaZyciem = v), d))} label="Zaświadczenie „Za życiem”" description="Rodzicielski wydłużony do 65/67 tygodni" />
                <Switch checked={data.child.path !== "biologiczny"} onCheckedChange={(v) => setData((d) => ((d.child.path = v ? "adopcja" : "biologiczny"), d))} label="Adopcja lub rodzina zastępcza" description="Urlop na warunkach urlopu macierzyńskiego – zależny od wieku dziecka" />
                {data.mother.title === "uop" && (
                  <Field label="Umowa na czas określony kończy się (opcjonalnie)" hint="Art. 177 § 3 KP – może przedłużyć się do dnia porodu">
                    <Input type="date" value={data.mother.contractEndDate ?? ""} onChange={(e) => setData((d) => ((d.mother.contractEndDate = e.target.value || undefined), d))} />
                  </Field>
                )}
                <Field label="Utrata pracy w ciąży">
                  <Select
                    value={data.mother.employmentLossReason ?? "brak"}
                    onChange={(v) => setData((d) => ((d.mother.employmentLossReason = v === "brak" ? null : (v as never)), d))}
                    options={[
                      { value: "brak", label: "Nie dotyczy" },
                      { value: "upadlosc", label: "Upadłość pracodawcy" },
                      { value: "likwidacja", label: "Likwidacja pracodawcy" },
                      { value: "smierc_pracodawcy", label: "Śmierć pracodawcy" },
                      { value: "bezprawne_zwolnienie", label: "Bezprawne zwolnienie (wyrok)" },
                    ]}
                  />
                </Field>
                <details className="rounded-xl border border-line px-4 py-3">
                  <summary className="cursor-pointer text-[15px] font-medium">Zwolnienia lekarskie w ciąży ({data.mother.sickLeaves.length})</summary>
                  <div className="mt-3">
                    <SickLeaveEditor />
                  </div>
                </details>
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[14px] font-medium text-muted">
                    <ShieldCheck className="h-4 w-4" /> Wstępny wynik – liczony przez silnik zgodny z ustawą
                  </div>
                  <Preview />
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="sticky bottom-3 mt-6 flex gap-2 rounded-xl border border-line bg-bg-elevated p-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => go(step - 1)}>
            <ArrowLeft className="h-4 w-4" /> Wstecz
          </Button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <Button onClick={() => go(step + 1)}>
            Dalej <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="success" onClick={finish}>
            <Check className="h-4 w-4" /> Przejdź do aplikacji
          </Button>
        )}
      </div>
    </div>
  );
}
