"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ArrowRight, Braces, Calculator, CheckCircle2, ChevronDown, Download, FileScan, FilePlus2, FileText, FolderOpen, Loader2, ShieldCheck, ShieldX, Sparkles, UploadCloud, X, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AnalysisResponse, CaseEvaluation, ExtractedDocument, ValidationIssue } from "@/models/document";
import { FORM_NAMES } from "@/models/document";
import { SAMPLE_SETS, type SampleCase } from "@/data/samples";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AiBadge, Badge, LegalChip, LegalText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { InfoTip } from "@/components/ui/info-tip";
import { BaseSteps } from "@/components/calculator/results";
import { CaseDataEditor, getPath, setPath, type FieldSource } from "./case-data-editor";
import { FormCompare } from "./form-compare";
import { useApp } from "@/store/app";
import { cn, dShort, zl } from "@/lib/utils";

/** Limit treści żądania funkcji serverless na Vercel (4,5 MB) – większe skany trzeba zmniejszyć. */
const MAX_BYTES = 4.4 * 1024 * 1024;

type DocItem = { key: string; name: string; status: "pending" | "done" | "error"; res?: AnalysisResponse; error?: string };
type Job = { name: string; init: RequestInit };

const short = (f: ExtractedDocument["formType"]) => (f === "POSWIADCZENIE" ? "Poświadczenie" : f === "ZRZUT-SYSTEMU" ? "Zrzut" : f === "NIEZNANY" ? "?" : f);

export function Analyzer() {
  const [samples, setSamples] = useState<SampleCase[]>([]);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiToggle, setUseAi] = useState(true);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [ev, setEv] = useState<CaseEvaluation | null>(null);
  const [cross, setCross] = useState<ValidationIssue[]>([]);
  const [draft, setDraft] = useState<ExtractedDocument | null>(null);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [recalc, setRecalc] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [evalDocs, setEvalDocs] = useState<DocItem[]>([]);
  const recalcTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();
  const { setData, aiConsent, data, loggedIn } = useApp();
  const useAi = aiToggle && aiConsent;
  /** dane rodziny z aplikacji – serwer dopasuje je do dokumentów po PESEL i porówna */
  const profile = loggedIn ? data : undefined;

  useEffect(() => {
    fetch("/api/documents/samples").then((r) => r.json()).then((j) => {
      setSamples(j.samples);
      setAiAvailable(j.aiAvailable);
    });
  }, []);

  async function evaluate(items: DocItem[]) {
    const done = items.filter((d) => d.status === "done" && d.res);
    setEvalDocs(done);
    if (!done.length) return (setEv(null), setDraft(null));
    const r = await fetch("/api/documents/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ documents: done.map((d) => d.res!.document), profile }) });
    const j = (await r.json()) as CaseEvaluation & { error?: string };
    if (!r.ok) return void toast.error("Nie udało się ocenić sprawy", { description: j.error });
    setEv(j);
    setCross(j.issues);
    setDraft(j.document);
    setEdited(new Set());
  }

  /** Analizuje pliki po kolei (każdy osobnym żądaniem), potem ocenia całą teczkę. */
  async function runJobs(jobs: Job[], append: boolean) {
    if (!jobs.length) return;
    setBusy(true);
    const base = append ? docs : [];
    if (!append) {
      setEv(null);
      setDraft(null);
    }
    let items: DocItem[] = [...base, ...jobs.map((j, i) => ({ key: `${Date.now()}-${i}-${j.name}`, name: j.name, status: "pending" as const }))];
    setDocs(items);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    for (const [i, job] of jobs.entries()) {
      const key = items[base.length + i].key;
      let patch: Partial<DocItem>;
      try {
        const r = await fetch("/api/documents/analyze", job.init);
        const j = await r.json().catch(() => ({ error: r.status === 413 ? "Plik za duży dla serwera demonstracyjnego" : `Błąd serwera (${r.status})` }));
        patch = r.ok ? { status: "done", res: j } : { status: "error", error: j.error };
      } catch (e) {
        patch = { status: "error", error: (e as Error).message };
      }
      items = items.map((d) => (d.key === key ? { ...d, ...patch } : d));
      setDocs(items);
    }
    await evaluate(items);
    setBusy(false);
  }

  const sampleJob = (s: SampleCase): Job => ({ name: s.file, init: { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sampleId: s.id, ai: useAi }) } });
  function addFiles(list: FileList | File[], append: boolean) {
    const files = [...list];
    const jobs: Job[] = [];
    for (const f of files) {
      if (!f.name.toLowerCase().endsWith(".pdf")) {
        toast.error(`${f.name}: to nie jest PDF`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: plik ma ${(f.size / 1048576).toFixed(1)} MB`, { description: "Wersja demonstracyjna przyjmuje pliki do 4,4 MB – zapisz skan w niższej rozdzielczości (np. 150 dpi) lub podziel go." });
        continue;
      }
      const fd = new FormData();
      fd.append("file", f);
      fd.append("ai", useAi ? "1" : "0");
      jobs.push({ name: f.name, init: { method: "POST", body: fd } });
    }
    void runJobs(jobs, append);
  }

  function removeDoc(key: string) {
    const items = docs.filter((d) => d.key !== key);
    setDocs(items);
    void evaluate(items);
  }

  function change(path: string, v: unknown) {
    if (!draft || !ev) return;
    const next = setPath(draft, path, v);
    setDraft(next);
    setEdited((s) => new Set(s).add(path));
    clearTimeout(recalcTimer.current);
    setRecalc(true);
    recalcTimer.current = setTimeout(async () => {
      const r = await fetch("/api/documents/evaluate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ document: next, fieldFrom: ev.fieldFrom, profile }) });
      if (r.ok) {
        const j = (await r.json()) as CaseEvaluation;
        setEv({ ...j, issues: cross });
      } else toast.error("Nie udało się przeliczyć – sprawdź poprawione pola");
      setRecalc(false);
    }, 450);
  }

  function resetEdits() {
    void evaluate(evalDocs);
  }

  function sourceOf(path: string): FieldSource {
    if (edited.has(path)) return { label: "poprawiono", tone: "edited" };
    const v = draft ? getPath(draft, path) : null;
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length)) return { label: "brak", tone: "missing" };
    const ds = evalDocs;
    const idx = ev?.fieldFrom[path] ?? (ds.length === 1 ? 0 : undefined);
    if (idx === -1) return { label: "z aplikacji", tone: "app" };
    const d = idx !== undefined ? ds[idx]?.res : undefined;
    if (!d) return { label: "z dokumentów", tone: "doc" };
    const ai = d.fieldSources[path] === "ai";
    return { label: `${short(d.document.formType)}${ai ? " · AI" : d.fieldSources[path] === "pdf" ? " · pole" : ""}`, tone: ai ? "ai" : "doc" };
  }

  function loadToProfile() {
    if (!ev) return;
    const { asOf: _asOf, ...rest } = ev.caseInput;
    void _asOf;
    setData(() => rest);
    toast.success("Dane z dokumentów wczytane do kalkulatora", { description: "Zastąpiły bieżące dane sprawy." });
    router.push("/kalkulator?tab=urlopy");
  }

  const pending = docs.some((d) => d.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprawdź dokumenty, zanim trafią do ZUS"
        description="Wgraj wniosek i zaświadczenia jednej sprawy (np. ZAM + Z-3 + poświadczenie ubezpieczenia) albo wybierz sprawę testową. Sprawdzimy braki formalne, ustalimy, czy osoba ma ubezpieczenie chorobowe, kto wypłaci zasiłek, ile i za jaki okres – a odczytane dane możesz poprawić."
        actions={<AiBadge active={useAi && aiAvailable} />}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader title="Sprawy testowe (dane fikcyjne)" subtitle="Każda sprawa to teczka dokumentów analizowanych razem – jak w zestawach ZUS" icon={<FolderOpen className="h-4 w-4" />} />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {SAMPLE_SETS.map((set, i) => {
              const files = samples.filter((s) => s.caseKey === set.key);
              return (
                <motion.div key={set.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex flex-col rounded-xl border border-line bg-surface-2/50 p-3.5 transition hover:border-line-strong">
                  <div className="text-[15px] font-bold leading-snug">{set.title}</div>
                  <p className="mt-1 text-[13px] leading-snug text-muted">{set.summary}</p>
                  <p className={cn("mt-1.5 text-[13px] font-medium", { green: "text-green", red: "text-red", orange: "text-orange", blue: "text-blue", gold: "text-gold" }[set.tone])}>Oczekiwany wynik: {set.expected}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {files.map((s) => (
                      <a key={s.id} href={`/samples/${s.file}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-[12px] font-medium text-fg-2 hover:border-brand hover:text-brand" title="Otwórz PDF">
                        <Download className="h-3 w-3" /> {s.form}
                      </a>
                    ))}
                  </div>
                  <Button size="sm" variant="secondary" className="mt-3 w-full" disabled={busy || !files.length} onClick={() => runJobs(files.map(sampleJob), false)}>
                    <FileScan className="h-3.5 w-3.5" /> Analizuj sprawę{files.length > 1 ? ` (${files.length} dok.)` : ""}
                  </Button>
                </motion.div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Własne dokumenty PDF" subtitle="Możesz wybrać kilka plików naraz – do 4,4 MB każdy" icon={<UploadCloud className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files, false);
                }}
                className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-9 text-center transition", drag ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong hover:bg-surface-2")}
              >
                <UploadCloud className={cn("h-8 w-8", drag ? "text-brand" : "text-muted")} />
                <span className="text-[15px] font-medium">Upuść PDF-y jednej sprawy lub kliknij, aby wybrać</span>
                <span className="text-[13px] text-muted">ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15, poświadczenie ubezpieczenia, zrzut z systemu, skany</span>
              </button>
              <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden" onChange={(e) => (e.target.files?.length && addFiles(e.target.files, false), (e.target.value = ""))} />
              <div className="rounded-xl border border-line p-3">
                <Switch
                  checked={useAi && aiAvailable}
                  onCheckedChange={setUseAi}
                  label={<span className="inline-flex items-center gap-2">Odczyt skanów i mapowanie przez AI <Sparkles className="h-3.5 w-3.5 text-gold" /></span>}
                  description={!aiConsent ? "Wyłączone w Ustawieniach → Konto (zgoda na wsparcie AI)." : aiAvailable ? "AI odczytuje skany (OCR) i uzupełnia pola, których nie znalazł parser. Dane osobowe w tekście są wcześniej ukrywane." : "AI niedostępne na tym serwerze – działa parser regułowy (PDF z warstwą tekstową). Pola ze skanu uzupełnisz ręcznie."}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Twoje dane są bezpieczne" icon={<ShieldCheck className="h-4 w-4 text-brand" />} />
            <CardBody>
              <ul className="space-y-2 text-[14px] leading-snug text-fg-2">
                <li>• Pliki analizujemy w pamięci i <b>nie zapisujemy</b> ich na serwerze.</li>
                <li>• Zanim tekst trafi do AI, <b>PESEL, NIP, numer konta, adres i kontakt</b> zastępujemy znacznikami (RODO).</li>
                <li>• Kwoty i uprawnienia liczy wyłącznie silnik zgodny z ustawą – AI tylko odczytuje pola.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <div ref={resultRef} className="scroll-mt-20 space-y-4">
        {docs.length > 0 && (
          <Folder
            docs={docs}
            busy={busy}
            onRemove={removeDoc}
            onAdd={() => {
              const inp = document.createElement("input");
              inp.type = "file";
              inp.accept = "application/pdf";
              inp.multiple = true;
              inp.onchange = () => inp.files?.length && addFiles(inp.files, true);
              inp.click();
            }}
            onClear={() => (setDocs([]), setEv(null), setDraft(null))}
          />
        )}
        <AnimatePresence>
          {ev && draft && !pending && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <VerdictCard ev={ev} recalc={recalc} edited={edited.size > 0} onLoad={loadToProfile} onJson={() => setJsonOpen(true)} loggedIn={loggedIn} />
              <IssuesCard docs={evalDocs} cross={cross} />
              {evalDocs.map((d) => d.res?.officialForm && <FormCompare key={d.key} res={d.res} />)}
              <CaseDataEditor doc={draft} onChange={change} sourceOf={sourceOf} edited={edited.size > 0} onReset={resetEdits} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Sheet open={jsonOpen} onOpenChange={setJsonOpen} title="Ustandaryzowany JSON sprawy" description="Dane po scaleniu dokumentów i poprawkach – wejście do silnika uprawnień." wide>
        <pre className="overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-fg-2">{draft && JSON.stringify(draft, null, 2)}</pre>
        {evalDocs.map((d) => (
          <div key={d.key}>
            <h4 className="mt-5 mb-2 text-sm font-semibold">Odczytany tekst: {d.name}</h4>
            <pre className="max-h-64 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[13px] whitespace-pre-wrap text-muted">{d.res?.textPreview || "— brak warstwy tekstowej (skan) —"}</pre>
          </div>
        ))}
      </Sheet>
    </div>
  );
}

function Folder({ docs, busy, onRemove, onAdd, onClear }: { docs: DocItem[]; busy: boolean; onRemove: (k: string) => void; onAdd: () => void; onClear: () => void }) {
  return (
    <Card>
      <CardHeader
        title={`Teczka sprawy · ${docs.length} ${docs.length === 1 ? "dokument" : docs.length < 5 ? "dokumenty" : "dokumentów"}`}
        subtitle="Dane ze wszystkich dokumentów łączymy w jedną sprawę: wynagrodzenia z Z-3/Z-3a, ubezpieczenie z poświadczenia, dziecko z wniosku."
        icon={<FolderOpen className="h-4 w-4" />}
        action={
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" disabled={busy} onClick={onAdd}>
              <FilePlus2 className="h-3.5 w-3.5" /> Dodaj dokument
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>
              Nowa sprawa
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-2">
        {docs.map((d) => {
          const r = d.res;
          const errors = r?.issues.filter((i) => i.severity === "error").length ?? 0;
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-line px-3 py-2.5">
              {d.status === "pending" ? <Loader2 className="h-5 w-5 animate-spin text-brand" /> : d.status === "error" ? <XCircle className="h-5 w-5 text-red" /> : <FileText className="h-5 w-5 text-brand" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{d.name}</div>
                <div className="text-[13px] text-muted">
                  {d.status === "pending" ? "Odczytywanie…" : d.status === "error" ? <span className="text-red">{d.error}</span> : `${FORM_NAMES[r!.document.formType]} · ${r!.extraction.pages} str.`}
                </div>
              </div>
              {r && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.officialForm ? <Badge tone="green">pola druku ZUS</Badge> : r.extraction.aiUsed ? <AiBadge /> : <Badge>parser</Badge>}
                  {r.extraction.scanned && <Badge tone="orange">skan</Badge>}
                  <Badge tone={errors ? "red" : "green"}>{errors ? `${errors} braki` : "bez braków"}</Badge>
                </div>
              )}
              {d.status !== "pending" && (
                <button onClick={() => onRemove(d.key)} disabled={busy} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label={`Usuń ${d.name} z teczki`}>
                  <X className="h-4 w-4" />
                </button>
              )}
              {r?.extraction.scanned && !r.extraction.aiUsed && <p className="w-full text-[13px] text-orange">Skan bez warstwy tekstowej – bez AI nie da się go odczytać automatycznie. Uzupełnij dane w sekcji „Dane sprawy” poniżej.</p>}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

function VerdictCard({ ev, recalc, edited, onLoad, onJson, loggedIn }: { ev: CaseEvaluation; recalc: boolean; edited: boolean; onLoad: () => void; onJson: () => void; loggedIn: boolean }) {
  const v = ev.verdict;
  const fromApp = Object.values(ev.fieldFrom).filter((i) => i === -1).length;
  const [howOpen, setHowOpen] = useState(false);
  return (
    <Card className={cn("relative overflow-hidden transition-opacity", recalc && "opacity-70", v.insured ? "border-[color-mix(in_oklab,var(--green)_35%,transparent)]" : "border-[color-mix(in_oklab,var(--red)_35%,transparent)]")}>
      <CardBody className="relative pt-6">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wider text-muted uppercase">
          Werdykt silnika uprawnień {edited && <Badge tone="blue">po poprawkach</Badge>} {recalc && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        <div className="mt-2 flex items-center gap-3">
          {v.insured ? <ShieldCheck className="h-9 w-9 shrink-0 text-green" /> : <ShieldX className="h-9 w-9 shrink-0 text-red" />}
          <div>
            <div className={cn("text-[22px] font-semibold tracking-tight sm:text-[28px]", v.insured ? "text-green" : "text-red")}>Ubezpieczenie chorobowe: {v.insured ? "TAK" : "NIE"}</div>
            <div className="text-[15px] text-fg-2">{v.insuredLabel}</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <LegalChip>{v.legalBasis}</LegalChip>
        </div>
        <p className={cn("mt-3 rounded-xl px-3 py-2 text-[14px]", ev.profileMatch ? "bg-blue-soft text-blue" : ev.profileMatch === null ? "bg-orange-soft text-orange" : "bg-surface-2 text-fg-2")}>
          {ev.profileMatch
            ? `Dokumenty dotyczą ${ev.profileMatch === "ojciec" ? "taty" : "mamy"} z Twojego profilu – wynik liczymy na Twoich danych z aplikacji z wartościami z dokumentów${fromApp ? `; ${fromApp} brakujących w dokumentach informacji uzupełniliśmy z aplikacji (oznaczone „z aplikacji”)` : ""}.`
            : ev.profileMatch === null
              ? "Dokumenty dotyczą innej osoby niż zapisana w aplikacji – wynik policzono wyłącznie z dokumentów."
              : loggedIn
                ? "Wynik policzono wyłącznie z dokumentów."
                : "Wynik policzono wyłącznie z dokumentów. Zaloguj się, aby porównać je z Twoimi danymi i planem urlopów."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-[13px] text-muted">Kto wypłaca</div>
            <div className="text-[18px] font-semibold text-brand">{v.payer.includes("Zakład") ? "ZUS" : "Pracodawca"}</div>
          </div>
          <div>
            <div className="text-[13px] text-muted">{v.benefitLabel}</div>
            <div className="num text-[18px] font-semibold text-gold">{v.insured ? `${zl(v.monthly)}/mies.` : "—"}</div>
          </div>
          <div>
            <div className="text-[13px] text-muted">Okres</div>
            <div className="text-[15px] font-semibold">{v.periodFrom ? `${dShort(v.periodFrom)} – ${dShort(v.periodTo)}` : "—"}</div>
            {v.totalWeeks > 0 && <div className="text-[13px] text-muted">{v.totalWeeks} tyg.</div>}
          </div>
          <div>
            <div className="text-[13px] text-muted">Łącznie</div>
            <div className="num text-[18px] font-semibold">{v.insured ? zl(v.total) : "—"}</div>
          </div>
        </div>
        {v.segments.length > 1 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-[14px]">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="py-1 font-medium">Okres</th>
                  <th className="py-1 font-medium">Od – do</th>
                  <th className="py-1 font-medium">Tyg.</th>
                  <th className="py-1 font-medium">Stawka</th>
                  <th className="py-1 text-right font-medium">Miesięcznie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {v.segments.map((s, i) => (
                  <tr key={i}>
                    <td className="py-1.5 pr-2">{s.label}</td>
                    <td className="py-1.5 pr-2">{dShort(s.from)} – {dShort(s.to)}</td>
                    <td className="num py-1.5 pr-2">{s.weeks}</td>
                    <td className="num py-1.5 pr-2">{Math.round(s.rate * 1000) / 10}%</td>
                    <td className="num py-1.5 text-right font-medium">{zl(s.monthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-[14px] text-muted">
          {v.payerReason} Podstawa wymiaru: {zl(v.base)} · stawka dzienna {zl(v.dailyBase)} · stawka {v.rateLabel}.
        </p>
        {v.blockedByDebt && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-soft px-4 py-3 text-[15px] text-red">
            <AlertOctagon className="h-4 w-4 shrink-0" />
            <span>
              <LegalText>Wypłata zablokowana do spłaty zadłużenia (art. 2a ustawy zasiłkowej) – prawo przedawnia się po 6 miesiącach.</LegalText>
            </span>
          </div>
        )}
        <button onClick={() => setHowOpen((o) => !o)} className="mt-4 flex items-center gap-1.5 text-[15px] font-bold text-brand" aria-expanded={howOpen}>
          <Calculator className="h-4 w-4" /> Jak policzyliśmy podstawę? <ChevronDown className={cn("h-4 w-4 transition", howOpen && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {howOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 rounded-xl border border-line p-3 sm:p-4">
                <BaseSteps base={ev.base} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button size="sm" onClick={onLoad}>
            Otwórz w kalkulatorze <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="secondary" onClick={onJson}>
            <Braces className="h-3.5 w-3.5" /> JSON i odczytany tekst
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function IssuesCard({ docs, cross }: { docs: DocItem[]; cross: ValidationIssue[] }) {
  const groups = [...(cross.length ? [{ name: "Cała teczka (spójność dokumentów)", issues: cross }] : []), ...docs.map((d) => ({ name: `${d.res ? short(d.res.document.formType) : ""} · ${d.name}`, issues: d.res?.issues ?? [] }))];
  const errors = groups.flatMap((g) => g.issues).filter((i) => i.severity === "error").length;
  const warnings = groups.flatMap((g) => g.issues).filter((i) => i.severity === "warning").length;
  return (
    <Card>
      <CardHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            Braki formalne
            <InfoTip title="Skąd te wymagania?">Sprawdzamy elementy, które musi zawierać każdy wniosek i zaświadczenie – wg załączników do rozporządzenia w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków – oraz sumy kontrolne PESEL, NIP, REGON i numeru rachunku.</InfoTip>
          </span>
        }
        subtitle="Popraw je przed złożeniem – inaczej ZUS wezwie do uzupełnienia, a wypłata się opóźni"
        icon={errors ? <XCircle className="h-4 w-4 text-red" /> : <CheckCircle2 className="h-4 w-4 text-green" />}
        action={<Badge tone={errors ? "red" : warnings ? "orange" : "green"}>{errors ? `${errors} błędy` : warnings ? `${warnings} uwagi` : "kompletne"}</Badge>}
      />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g.name} className="min-w-0 space-y-1.5">
            <div className="truncate text-[14px] font-bold text-fg-2">{g.name}</div>
            {[...g.issues].sort((a, b) => ["error", "warning", "info"].indexOf(a.severity) - ["error", "warning", "info"].indexOf(b.severity)).map((i, k) => (
              <div key={k} className={cn("rounded-xl px-3 py-2 text-[14px]", i.severity === "error" ? "bg-red-soft text-red" : i.severity === "warning" ? "bg-orange-soft text-orange" : "bg-surface-2 text-fg-2")}>
                <div className="font-medium">{i.message}</div>
                {i.hint && i.severity !== "info" && (
                  <div className="mt-1 text-[13px] text-fg-2">
                    <b>Skąd to wziąć:</b> {i.hint}
                  </div>
                )}
                {i.legal && <LegalChip className="mt-1.5">{i.legal}</LegalChip>}
              </div>
            ))}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
