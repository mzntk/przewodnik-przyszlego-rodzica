"use client";
import { Check, ChevronRight, CirclePlay, ClipboardList, Download, ExternalLink, Eye, FileDown, FileWarning, Info, ListChecks, Paperclip, Pencil, RefreshCw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { CASE_STATUSES, STATUS_TONE, statusLabel, type CaseState, type CaseStatus } from "@/models/case-status";
import { GUIDES, type DocGuide, type DocId, type Recipient } from "@/data/documents";
import { DocIcon } from "./doc-icon";
import { MotionTabs } from "@/components/ui/tabs";
import { Segmented } from "@/components/ui/form";
import { FORM_ID, listCases, guideContext, type CaseItem } from "@/lib/cases";
import { buildForms } from "@/components/forms/form-catalog";
import { buildFormPdf, downloadBytes } from "@/lib/pdf";
import { Sheet } from "@/components/ui/sheet";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Term } from "@/components/ui/term";
import { cn, dPL, dShort, plural, zl } from "@/lib/utils";

export function StatusPill({ status, to, className }: { status: CaseStatus; to: Recipient; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {statusLabel(status, to)}
    </Badge>
  );
}

export const caseStatus = (cases: Record<string, CaseState>, id: string): CaseStatus => cases[id]?.status ?? "niezlozony";

/** Sprawy rodziny z aktualnym stanem – jedno źródło dla pulpitu, listy spraw i panelu taty. */
export function useCases() {
  const { data, cases, account } = useApp();
  const { result } = useCalculation();
  return useMemo(() => {
    if (!result) return { items: [] as CaseItem[], ready: false };
    const all = listCases(data, result);
    const items = account === "tata" ? all.filter((c) => c.guide.owner === "tata" || c.guide.to === "USC" || c.guide.id === "NFZ-ZGLOSZENIE" || c.guide.id === "800PLUS") : all;
    return { items, ready: true };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, result, account, cases]);
}

export function CaseRow({ item, onOpen, compact }: { item: CaseItem; onOpen: () => void; compact?: boolean }) {
  const cases = useApp((s) => s.cases);
  const st = caseStatus(cases, item.guide.id);
  const d = item.deadline && item.deadline.daysLeft >= 0 && (st === "niezlozony" || st === "uzupelnienie") ? item.deadline : undefined;
  return (
    <button onClick={onOpen} className="group flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2">
      <DocIcon id={item.guide.id} code={item.guide.code} />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] leading-snug font-bold text-fg">{item.guide.name}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted">
          <StatusPill status={st} to={item.guide.to} />
          {!compact && <span>{item.guide.owner === "płatnik" ? "wystawia pracodawca" : `do: ${item.guide.to}`}</span>}
          {d && <span className={cn(d.daysLeft <= 14 && "font-bold text-orange")}>termin {dShort(d.date)} ({d.daysLeft} {plural(d.daysLeft, "dzień", "dni", "dni")})</span>}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function StatusSteps({ status }: { status: CaseStatus }) {
  const flow: CaseStatus[] = status === "uzupelnienie" ? ["niezlozony", "zarejestrowany", "weryfikacja", "uzupelnienie"] : CASE_STATUSES.filter((x) => x !== "uzupelnienie");
  const idx = flow.indexOf(status);
  const labels: Record<CaseStatus, string> = { niezlozony: "Niezłożony", zarejestrowany: "Zarejestrowany", weryfikacja: "Weryfikacja", uzupelnienie: "Uzupełnienie", przyznany: "Decyzja" };
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${flow.length}, minmax(0, 1fr))` }} aria-label="Etapy sprawy">
      {flow.map((s, i) => (
        <li key={s}>
          <div className={cn("h-1.5 rounded-full", i <= idx ? (s === "uzupelnienie" ? "bg-red" : s === "przyznany" ? "bg-green" : "bg-blue") : "bg-surface-3")} />
          <div className={cn("mt-1.5 text-[13px]", i <= idx ? "font-bold text-fg-2" : "text-muted")}>{labels[s]}</div>
        </li>
      ))}
    </ol>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Info; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-[16px] font-bold text-fg">
        <Icon className="h-4 w-4 text-brand" /> {title}
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** Pliki wzorów z public/formularze (pobierane raz na sesję). */
let formFiles: Promise<string[]> | null = null;
function useFormFiles() {
  const [files, setFiles] = useState<string[]>([]);
  useEffect(() => {
    formFiles ??= fetch("/api/forms").then((r) => r.json()).then((j) => j.files as string[]).catch(() => []);
    formFiles.then(setFiles);
  }, []);
  return files;
}

/** Kartka „wypełnionego druku” – podgląd z możliwością poprawienia każdego pola przed pobraniem. */
function PaperPreview({ code, title, addressee, fields, values, onChange, statements, attachments, signer, editing }: { code: string; title: string; addressee: string; fields: { key: string; label: string }[]; values: Record<string, string>; onChange: (k: string, v: string) => void; statements?: string[]; attachments: string[]; signer: string; editing: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 border-b-2 border-brand px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-wider text-brand uppercase">{code}</div>
          <div className="text-[15px] leading-snug font-black sm:text-[17px]">{title}</div>
        </div>
        <span className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">podgląd</span>
      </div>
      <div className="space-y-3 px-4 py-4 font-[Lato] sm:px-6">
        <div className="text-right text-[12px] text-muted">
          Adresat: <b className="text-fg-2">{addressee}</b>
        </div>
        <dl className="divide-y divide-dashed divide-line">
          {fields.map((f) => {
            const v = values[f.key] ?? "";
            return (
              <div key={f.key} className="grid gap-0.5 py-2 sm:grid-cols-[42%_1fr] sm:gap-3">
                <dt className="text-[12px] text-muted">{f.label}</dt>
                <dd className="min-w-0">
                  {editing ? (
                    <input value={v} onChange={(e) => onChange(f.key, e.target.value)} aria-label={f.label} className={cn("w-full border-b bg-transparent py-0.5 text-[14px] font-bold outline-none focus:border-brand", v.trim() ? "border-line-strong" : "border-orange bg-orange-soft/60")} placeholder="uzupełnij" />
                  ) : (
                    <span className={cn("text-[14px] font-bold", !v.trim() && "rounded bg-orange-soft px-1 font-normal text-orange")}>{v.trim() || "do uzupełnienia"}</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {statements && statements.length > 0 && (
          <div className="space-y-1 rounded bg-surface-2 p-3 text-[12px] text-fg-2">
            {statements.map((x) => (
              <p key={x}>☑ {x}</p>
            ))}
          </div>
        )}
        {attachments.length > 0 && (
          <div className="text-[12px] text-fg-2">
            <b>Załączniki:</b> {attachments.join("; ")}
          </div>
        )}
        <div className="flex items-end justify-between gap-4 pt-4 text-[12px] text-muted">
          <span>{dPL(new Date().toISOString().slice(0, 10))}</span>
          <span className="border-t border-line-strong px-6 pt-1 text-center italic">{signer}</span>
        </div>
      </div>
    </div>
  );
}

const SIM_DAYS: Record<string, number> = { ZAM: 18, "Z-3": 14, "Z-3a": 16, "ZAS-53": 21, "Z-15A": 12, "Z-12": 25, Wniosek: 7, USC: 3 };

/** Symulacja wniosku: co się wydarzy po wysłaniu – bez zmiany prawdziwego statusu sprawy. */
function Simulation({ g, complete, payerIsZus, amount }: { g: DocGuide; complete: boolean; payerIsZus: boolean; amount?: number }) {
  const [withGaps, setWithGaps] = useState(!complete);
  const [step, setStep] = useState(-1);
  const base = SIM_DAYS[g.code] ?? 14;
  const days = Math.round((g.to === "pracodawca" ? base * 0.6 : base) * (withGaps ? 1.8 : 1));
  const channel = g.to === "ZUS" ? "PUE/eZUS" : g.to === "USC" ? "gov.pl" : "kadry pracodawcy";
  const steps = [
    { day: 0, title: "Wysyłasz wniosek", text: `Przez ${channel}. Dostajesz potwierdzenie (UPO) z numerem sprawy.` },
    { day: 1, title: "Rejestracja", text: g.to === "ZUS" ? "ZUS rejestruje sprawę i przypisuje ją do oddziału." : g.to === "USC" ? "Urząd rejestruje zgłoszenie." : "Kadry przyjmują wniosek." },
    { day: 2, title: "Weryfikacja", text: g.to === "ZUS" ? `ZUS sprawdza Twoje ubezpieczenie, ${payerIsZus ? "zaświadczenie Z-3 od pracodawcy" : "dokumenty"} i dane z rejestru USC.` : "Sprawdzenie kompletności i terminów." },
    ...(withGaps ? [{ day: Math.round(days / 2), title: "Prośba o uzupełnienie", text: "Brakuje danych lub załącznika – masz zwykle 7 dni na uzupełnienie. Termin rozpatrzenia liczy się od nowa.", warn: true }] : []),
    { day: days, title: g.to === "ZUS" ? "Decyzja i wypłata" : g.to === "USC" ? "Sprawa załatwiona" : "Wniosek zatwierdzony", text: g.to === "ZUS" ? `Zasiłek trafia na konto${amount ? ` – ok. ${zl(amount)} miesięcznie` : ""}. ZUS ma na wypłatę do 30 dni od otrzymania kompletu dokumentów.` : g.to === "USC" ? "Akt urodzenia sporządzony, PESEL nadany – odpis trafi do ZUS automatycznie." : "Urlop wpisany do akt; zasiłek wypłaca pracodawca razem z pensją." },
  ];
  useEffect(() => {
    if (step < 0 || step >= steps.length - 1) return;
    const t = setTimeout(() => setStep((x) => x + 1), 900);
    return () => clearTimeout(t);
  }, [step, steps.length]);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented value={withGaps ? "braki" : "ok"} onChange={(v) => (setWithGaps(v === "braki"), setStep(-1))} options={[{ value: "ok", label: "Kompletny" }, { value: "braki", label: "Z brakami" }]} />
        <Button size="sm" onClick={() => setStep(0)}>
          <CirclePlay className="h-4 w-4" /> {step < 0 ? "Uruchom symulację" : "Od nowa"}
        </Button>
      </div>
      <ol className="mt-4 space-y-0">
        {steps.map((x, i) => {
          const on = i <= step;
          const warn = "warn" in x && x.warn;
          return (
            <li key={x.title} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && <span className={cn("absolute top-6 bottom-0 left-[11px] w-0.5", i < step ? "bg-brand" : "bg-line")} />}
              <span className={cn("relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold transition-colors", on ? (warn ? "border-orange bg-orange text-white" : "border-brand bg-brand text-white") : "border-line bg-white text-muted")}>{i + 1}</span>
              <div className={cn("min-w-0 transition-opacity", on ? "opacity-100" : "opacity-45")}>
                <div className="text-[15px] font-bold">
                  {x.title} <span className="font-normal text-muted">· {x.day === 0 ? "dzień 0" : `ok. ${x.day}. dzień`}</span>
                </div>
                <p className="text-[14px] text-fg-2">{x.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12px] text-muted">Symulacja na podstawie średnich czasów rozpatrywania (model demonstracyjny). Nie zmienia statusu Twojej sprawy.</p>
    </div>
  );
}

/** Globalny panel sprawy – otwierany z pulpitu, listy spraw, wyszukiwarki i panelu taty. */
export function CaseSheet() {
  const { activeCase, openCase, data, cases, setCase, profileId, account } = useApp();
  const { result } = useCalculation();
  const files = useFormFiles();
  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"jak" | "podglad" | "symulacja">("jak");
  const [busy, setBusy] = useState(false);
  const item = useMemo<CaseItem | undefined>(() => {
    if (!result || !activeCase) return undefined;
    const own = listCases(data, result).find((c) => c.guide.id === activeCase);
    const g = GUIDES[activeCase as DocId];
    return own ?? (g ? { guide: g, formId: FORM_ID[g.id] } : undefined);
  }, [result, activeCase, data]);
  const form = useMemo(() => (result && item?.formId ? buildForms(data, result).find((f) => f.id === item.formId) : undefined), [result, item, data]);
  if (!result) return null;

  const g = item?.guide;
  const state = g ? cases[g.id] : undefined;
  const st = state?.status ?? "niezlozony";
  const ctx = guideContext(data, result);
  const attachments = g ? g.attachments(ctx) : [];
  const fieldValues = form ? Object.fromEntries(form.fields.map((f) => [f.key, values[f.key] ?? f.value])) : {};
  const missing = form ? form.fields.filter((f) => !fieldValues[f.key]?.trim()).length : 0;
  const mine = !!(g && result && listCases(data, result).some((c) => c.guide.id === g.id));
  const canSend = mine && g && g.owner !== "płatnik" && (st === "niezlozony" || st === "uzupelnienie") && (account !== "tata" || g.owner === "tata" || g.to === "USC");
  const addressee = g ? (g.to === "pracodawca" ? data.mother.payer?.name || "Pracodawca" : g.to === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : "Kierownik Urzędu Stanu Cywilnego") : "";
  const signer = fieldValues.name || `${data.mother.firstName} ${data.mother.lastName}`;
  const blank = g && files.find((f) => f === `${g.id}.pdf`);
  const sample = g && files.find((f) => f === `${g.id}-przyklad.pdf`);
  const monthly = result.segments.find((x) => x.who === (g?.owner === "tata" ? "ojciec" : "matka") && x.monthlyAmount > 0)?.monthlyAmount;

  async function exportPdf() {
    if (!form || !g) return;
    const bytes = await buildFormPdf({ code: g.code, title: form.title, addressee, legal: g.legal, fields: form.fields.map((f) => ({ label: f.label, value: fieldValues[f.key] })), attachments, statements: form.statements, signer, place: "", date: dPL(new Date().toISOString().slice(0, 10)) });
    downloadBytes(bytes, `${g.id}.pdf`);
    toast.success("Pobrano wypełniony wniosek (PDF)", { description: missing ? `${missing} ${plural(missing, "pole zostało puste", "pola zostały puste", "pól zostało pustych")} – uzupełnij je odręcznie.` : undefined });
  }

  async function send() {
    if (!g) return;
    setBusy(true);
    await fetch("/api/integrations/submit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: g.code, payer: g.to === "pracodawca" ? "pracodawca" : "zus", complete: missing === 0 }) });
    const now = new Date().toISOString();
    setCase(g.id, { status: "zarejestrowany", submittedAt: now, updatedAt: now, complete: missing === 0, note: g.to === "ZUS" ? "Wniosek przyjęty przez PUE/eZUS." : g.to === "USC" ? "Zgłoszenie przyjęte przez gov.pl." : "Wniosek przekazany do kadr." });
    setBusy(false);
    toast.success("Wysłano – status zmieni się po synchronizacji z ZUS", { description: missing ? `Uwaga: ${missing} ${plural(missing, "pole jest puste", "pola są puste", "pól jest pustych")} – sprawa może wymagać uzupełnienia.` : undefined });
    void profileId;
  }

  const close = () => (openCase(null), setValues({}), setEditing(false), setTab("jak"));

  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && close()} title={g?.name ?? ""} description={g ? `${g.to === "pracodawca" ? "Składasz u pracodawcy" : g.to === "USC" ? "Składasz w USC" : g.owner === "płatnik" ? "Wystawia pracodawca i wysyła do ZUS" : "Składasz w ZUS"} · ${g.legal}` : undefined} wide>
      {g && (
        <div className="space-y-6 pb-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-[15px]">
                <DocIcon id={g.id} code={g.code} />
                <div>
                  {g.glossary ? <Term id={g.glossary} className="font-bold">{g.code}</Term> : <span className="font-bold">{g.code}</span>}
                  <div className="mt-1">{mine ? <StatusPill status={st} to={g.to} /> : <Badge>nie dotyczy Twojej sytuacji</Badge>}</div>
                </div>
              </div>
              {mine && (
                <span className="flex items-center gap-1 text-[13px] text-muted">
                  <RefreshCw className="h-3.5 w-3.5" /> status z ZUS · {state ? new Date(state.updatedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "brak zgłoszenia"}
                </span>
              )}
            </div>
            {mine && (
              <div className="mt-4">
                <StatusSteps status={st} />
              </div>
            )}
            {state?.note && <p className={cn("mt-3 text-[15px]", st === "uzupelnienie" ? "font-bold text-red" : "text-fg-2")}>{state.note}</p>}
            {item?.deadline && item.deadline.daysLeft >= 0 && st === "niezlozony" && (
              <p className="mt-2 text-[15px] text-fg-2">
                Termin: <b>{dShort(item.deadline.date)}</b> (za {item.deadline.daysLeft} {plural(item.deadline.daysLeft, "dzień", "dni", "dni")}).
              </p>
            )}
          </div>

          <MotionTabs
            layoutId="case-tab"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "jak", label: "Jak załatwić", icon: <ListChecks className="h-4 w-4" /> },
              ...(form ? [{ id: "podglad" as const, label: missing ? `Podgląd (${missing} do uzup.)` : "Podgląd wniosku", icon: <Eye className="h-4 w-4" /> }] : []),
              { id: "symulacja", label: "Symulacja", icon: <CirclePlay className="h-4 w-4" /> },
            ]}
          />

          {tab === "jak" && (
            <div className="space-y-7">
              <Section icon={ListChecks} title="Jak wypełnić">
                <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-fg-2 marker:font-bold marker:text-muted">
                  {g.howTo.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ol>
                {g.mistakes.length > 0 && (
                  <div className="mt-3 rounded-xl bg-orange-soft px-4 py-3">
                    <div className="flex items-center gap-2 text-[14px] font-bold text-orange">
                      <FileWarning className="h-4 w-4" /> Najczęstsze błędy
                    </div>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[14px] text-fg-2">
                      {g.mistakes.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              <Section icon={ClipboardList} title="Co przygotować wcześniej">
                <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-fg-2">
                  {g.prepare.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </Section>

              <Section icon={Paperclip} title="Wymagane załączniki">
                {attachments.length ? (
                  <ul className="list-disc space-y-1.5 pl-5 text-[15px] text-fg-2">
                    {attachments.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[15px] text-fg-2">W Twojej sytuacji nie dołączasz żadnych załączników.</p>
                )}
                {ctx.payerIsZus && (g.id === "ZAM" || g.id.startsWith("URLOP")) && <p className="mt-2 text-[14px] text-muted">Zasiłek wypłaca ZUS, więc nie dołączasz odpisu aktu urodzenia – ZUS pobierze dane z rejestru (§ 13 ust. 2 rozp. z 27.09.2026).</p>}
                <LegalChip className="mt-3">Stan prawny po 24.10.2026: ZUR i ZAO połączone z ZAM, Z-3b zlikwidowany</LegalChip>
              </Section>

              <Section icon={FileDown} title="Wzór druku i przykład wypełnienia">
                <div className="flex flex-wrap gap-2">
                  {blank && (
                    <a href={`/formularze/${blank}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-[15px] font-bold hover:border-brand">
                      <FileDown className="h-4 w-4 text-brand" /> Pusty wzór (PDF)
                    </a>
                  )}
                  {sample && (
                    <a href={`/formularze/${sample}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-[15px] font-bold hover:border-brand">
                      <Eye className="h-4 w-4 text-brand" /> Przykład wypełnienia (PDF)
                    </a>
                  )}
                  <a href="https://www.zus.pl/wzory-formularzy" target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3 text-[15px] text-fg-2 hover:border-brand">
                    <ExternalLink className="h-4 w-4" /> Wzory formularzy na zus.pl
                  </a>
                </div>
                {!blank && !sample && <p className="mt-2 text-[13px] text-muted">Oficjalny wzór i przykład pojawią się tu po dodaniu plików PDF z zus.pl.</p>}
              </Section>
            </div>
          )}

          {tab === "podglad" && form && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] text-fg-2">Tak będzie wyglądał wniosek wypełniony Twoimi danymi. {missing ? <b className="text-orange">Pola na pomarańczowo – do uzupełnienia.</b> : "Wszystkie pola są wypełnione."}</p>
                <Button size="sm" variant={editing ? "primary" : "secondary"} onClick={() => setEditing((v) => !v)}>
                  {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />} {editing ? "Gotowe" : "Edytuj przed pobraniem"}
                </Button>
              </div>
              <PaperPreview code={g.code} title={form.title} addressee={addressee} fields={form.fields} values={fieldValues} onChange={(k, v) => setValues((x) => ({ ...x, [k]: v }))} statements={form.statements} attachments={attachments} signer={signer} editing={editing} />
              {Object.keys(values).length > 0 && (
                <button onClick={() => setValues({})} className="text-[13px] font-bold text-muted hover:text-fg">
                  Przywróć dane z profilu
                </button>
              )}
            </div>
          )}

          {tab === "symulacja" && <Simulation g={g} complete={missing === 0} payerIsZus={ctx.payerIsZus} amount={monthly} />}

          <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t border-line bg-white px-5 pt-4 sm:-mx-6 sm:flex-row sm:px-6">
            {form && (
              <Button variant="secondary" onClick={() => (tab !== "podglad" ? setTab("podglad") : exportPdf())} className="flex-1">
                {tab !== "podglad" ? <Eye className="h-4 w-4" /> : <Download className="h-4 w-4" />} {tab !== "podglad" ? "Zobacz wypełniony wniosek" : "Pobierz wypełniony PDF"}
              </Button>
            )}
            {canSend && (
              <Button onClick={send} disabled={busy} className="flex-1">
                <Send className="h-4 w-4" /> {st === "uzupelnienie" ? "Wyślij uzupełnienie" : g.to === "pracodawca" ? "Wyślij do pracodawcy" : g.to === "USC" ? "Złóż przez gov.pl" : "Wyślij przez PUE/eZUS"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
