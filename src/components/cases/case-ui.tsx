"use client";
import { ChevronRight, ClipboardList, Download, FileWarning, Info, ListChecks, Paperclip, RefreshCw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { CASE_STATUSES, STATUS_TONE, statusLabel, type CaseState, type CaseStatus } from "@/models/case-status";
import type { Recipient } from "@/data/documents";
import { listCases, guideContext, type CaseItem } from "@/lib/cases";
import { buildForms } from "@/components/forms/form-catalog";
import { buildFormPdf, downloadBytes } from "@/lib/pdf";
import { Sheet } from "@/components/ui/sheet";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Term } from "@/components/ui/term";
import { cn, dPL, dShort, plural } from "@/lib/utils";

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
      <span className="grid h-10 w-12 shrink-0 place-items-center rounded-lg border border-line bg-white text-[12px] font-bold text-fg-2">{item.guide.code}</span>
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

/** Globalny panel sprawy – otwierany z pulpitu, listy spraw i panelu taty. */
export function CaseSheet() {
  const { activeCase, openCase, data, cases, setCase, profileId, account } = useApp();
  const { result } = useCalculation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const item = useMemo(() => (result && activeCase ? listCases(data, result).find((c) => c.guide.id === activeCase) : undefined), [result, activeCase, data]);
  const form = useMemo(() => (result && item?.formId ? buildForms(data, result).find((f) => f.id === item.formId) : undefined), [result, item, data]);
  if (!result) return null;

  const g = item?.guide;
  const state = g ? cases[g.id] : undefined;
  const st = state?.status ?? "niezlozony";
  const ctx = guideContext(data, result);
  const attachments = g ? g.attachments(ctx) : [];
  const fieldValues = form ? Object.fromEntries(form.fields.map((f) => [f.key, values[f.key] ?? f.value])) : {};
  const missing = form ? form.fields.filter((f) => !fieldValues[f.key]?.trim()).length : 0;
  const canSend = g && g.owner !== "płatnik" && (st === "niezlozony" || st === "uzupelnienie") && (account !== "tata" || g.owner === "tata" || g.to === "USC");

  async function exportPdf() {
    if (!form || !g) return;
    const bytes = await buildFormPdf({
      code: g.code,
      title: form.title,
      addressee: g.to === "pracodawca" ? data.mother.payer?.name || "Pracodawca" : g.to === "ZUS" ? "Zakład Ubezpieczeń Społecznych" : "Kierownik Urzędu Stanu Cywilnego",
      legal: g.legal,
      fields: form.fields.map((f) => ({ label: f.label, value: fieldValues[f.key] })),
      attachments,
      statements: form.statements,
      signer: fieldValues.name || `${data.mother.firstName} ${data.mother.lastName}`,
      place: "",
      date: dPL(new Date().toISOString().slice(0, 10)),
    });
    downloadBytes(bytes, `${g.id}.pdf`);
    toast.success("Pobrano wypełniony wniosek (PDF)");
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

  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && (openCase(null), setValues({}), setShowForm(false))} title={g?.name ?? ""} description={g ? `${g.to === "pracodawca" ? "Składasz u pracodawcy" : g.to === "USC" ? "Składasz w USC" : g.owner === "płatnik" ? "Wystawia pracodawca i wysyła do ZUS" : "Składasz w ZUS"} · ${g.legal}` : undefined} wide>
      {g && (
        <div className="space-y-7 pb-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[15px]">
                {g.glossary ? <Term id={g.glossary} className="font-bold">{g.code}</Term> : <span className="font-bold">{g.code}</span>}
                <StatusPill status={st} to={g.to} />
              </div>
              <span className="flex items-center gap-1 text-[13px] text-muted">
                <RefreshCw className="h-3.5 w-3.5" /> status z ZUS · {state ? new Date(state.updatedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "brak zgłoszenia"}
              </span>
            </div>
            <div className="mt-4">
              <StatusSteps status={st} />
            </div>
            {state?.note && <p className={cn("mt-3 text-[15px]", st === "uzupelnienie" ? "font-bold text-red" : "text-fg-2")}>{state.note}</p>}
            {item?.deadline && item.deadline.daysLeft >= 0 && st === "niezlozony" && (
              <p className="mt-2 text-[15px] text-fg-2">
                Termin: <b>{dShort(item.deadline.date)}</b> (za {item.deadline.daysLeft} {plural(item.deadline.daysLeft, "dzień", "dni", "dni")}).
              </p>
            )}
          </div>

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
            {ctx.payerIsZus && (g.id === "ZAM" || g.id.startsWith("URLOP")) && (
              <p className="mt-2 text-[14px] text-muted">
                Zasiłek wypłaca ZUS, więc nie dołączasz odpisu aktu urodzenia – ZUS pobierze dane z rejestru (§ 13 ust. 2 rozp. z 27.09.2026).
              </p>
            )}
            <LegalChip className="mt-3">Stan prawny po 24.10.2026: ZUR i ZAO połączone z ZAM, Z-3b zlikwidowany</LegalChip>
          </Section>

          {form && (
            <section className="rounded-xl border border-line">
              <button onClick={() => setShowForm((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-bold" aria-expanded={showForm}>
                Wypełniony wniosek z Twoich danych {missing > 0 && <Badge tone="orange">{missing} do uzupełnienia</Badge>}
                <ChevronRight className={cn("h-4 w-4 text-muted transition-transform", showForm && "rotate-90")} />
              </button>
              {showForm && (
                <div className="space-y-3 border-t border-line px-4 py-4">
                  {form.fields.map((f) => (
                    <Field key={f.key} label={f.label} htmlFor={`f-${f.key}`}>
                      <Input id={`f-${f.key}`} value={fieldValues[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className={cn(!fieldValues[f.key]?.trim() && "border-orange")} />
                    </Field>
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="sticky bottom-0 -mx-5 flex flex-col gap-2 border-t border-line bg-white px-5 pt-4 sm:-mx-6 sm:flex-row sm:px-6">
            {form && (
              <Button variant="secondary" onClick={exportPdf} className="flex-1">
                <Download className="h-4 w-4" /> Pobierz wypełniony PDF
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
