"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, ArrowRight, Braces, CheckCircle2, Download, FileScan, FileText, Loader2, ShieldCheck, ShieldX, Sparkles, UploadCloud, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { AnalysisResponse } from "@/models/document";
import { FORM_NAMES } from "@/models/document";
import type { SampleCase } from "@/data/samples";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AiBadge, Badge, LegalChip, LegalText } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { useApp } from "@/store/app";
import { cn, dShort, zl } from "@/lib/utils";

export function Analyzer() {
  const [samples, setSamples] = useState<SampleCase[]>([]);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiToggle, setUseAi] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [res, setRes] = useState<AnalysisResponse | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setData, aiConsent } = useApp();
  const useAi = aiToggle && aiConsent;

  useEffect(() => {
    fetch("/api/documents/samples").then((r) => r.json()).then((j) => {
      setSamples(j.samples);
      setAiAvailable(j.aiAvailable);
    });
  }, []);

  async function run(label: string, init: RequestInit) {
    setBusy(label);
    setRes(null);
    try {
      const r = await fetch("/api/documents/analyze", init);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRes(j);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e) {
      toast.error("Analiza nie powiodła się", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const analyzeSample = (s: SampleCase) => run(s.id, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sampleId: s.id, ai: useAi }) });
  const analyzeFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) return toast.error("Wybierz plik PDF");
    const fd = new FormData();
    fd.append("file", f);
    fd.append("ai", useAi ? "1" : "0");
    run(f.name, { method: "POST", body: fd });
  };

  function loadToProfile() {
    if (!res) return;
    const { asOf: _asOf, ...rest } = res.caseInput;
    void _asOf;
    setData(() => rest);
    toast.success("Dane z dokumentu wczytane do kalkulatora", { description: "Zastąpiły bieżące dane sprawy." });
    router.push("/kalkulator?tab=urlopy");
  }

  return (
    <div className="space-y-6">
      <PageHeader
       
        title="Sprawdź dokument, zanim trafi do ZUS"
        description="Wgraj własny PDF albo wybierz zanonimizowaną sprawę testową. System wykryje braki formalne, ustali czy osoba ma ubezpieczenie chorobowe, kto wypłaca świadczenie oraz jego wysokość i okres."
        actions={<AiBadge active={useAi && aiAvailable} />}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Sprawy testowe (dane fikcyjne)" subtitle="Druki ZAM, Z-3, Z-3a, ZAS-53, poświadczenie ubezpieczenia, zrzut systemu" icon={<FileText className="h-4 w-4" />} />
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {samples.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={cn("group relative rounded-xl border border-line bg-surface-2/50 p-3.5 transition hover:border-line-strong", busy === s.id && "ring-2 ring-blue")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="blue">{s.form}</Badge>
                      <span className="truncate text-[15px] font-semibold">{s.person}</span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-snug text-muted">{s.summary}</p>
                    <p className={cn("mt-1.5 text-[13px] font-medium", { green: "text-green", red: "text-red", orange: "text-orange", blue: "text-blue", gold: "text-gold" }[s.tone])}>Oczekiwany wynik: {s.expected}</p>
                  </div>
                  <a href={`/samples/${s.file}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg" title="Pobierz PDF">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
                <Button size="sm" variant="secondary" className="mt-3 w-full" disabled={!!busy} onClick={() => analyzeSample(s)}>
                  {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileScan className="h-3.5 w-3.5" />} Analizuj
                </Button>
              </motion.div>
            ))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Własny dokument PDF" subtitle="Maks. 15 MB · dane przetwarzane tylko na potrzeby analizy" icon={<UploadCloud className="h-4 w-4" />} />
            <CardBody className="space-y-4">
              <button
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => (e.preventDefault(), setDrag(true))}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  const f = e.dataTransfer.files[0];
                  if (f) analyzeFile(f);
                }}
                className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition", drag ? "border-blue bg-blue-soft" : "border-line hover:border-line-strong hover:bg-surface-2")}
              >
                <UploadCloud className={cn("h-8 w-8", drag ? "text-blue" : "text-muted")} />
                <span className="text-[15px] font-medium">Upuść PDF lub kliknij, aby wybrać</span>
                <span className="text-[13px] text-muted">ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-15A/B, Z-12, poświadczenia, skany</span>
              </button>
              <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && analyzeFile(e.target.files[0])} />
              <div className="rounded-xl border border-line p-3">
                <Switch checked={useAi && aiAvailable} onCheckedChange={setUseAi} label={<span className="inline-flex items-center gap-2">Mapowanie i OCR wspierane przez AI <Sparkles className="h-3.5 w-3.5 text-gold" /></span>} description={!aiConsent ? "Wyłączone w Ustawieniach → Konto (zgoda na wsparcie AI)." : aiAvailable ? "AI odczytuje skany i uzupełnia pola, których nie znalazł parser. Dane osobowe są wcześniej ukrywane. Skany (obrazy) trafiają do AI w całości – wyłącz, jeśli nie chcesz." : "AI niedostępne – działa parser regułowy."} />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Twoje dane są bezpieczne" icon={<ShieldCheck className="h-4 w-4 text-brand" />} />
            <CardBody>
              <ul className="space-y-2 text-[14px] leading-snug text-fg-2">
                <li>• Plik analizujemy w pamięci i <b>nie zapisujemy</b> go na serwerze.</li>
                <li>• Zanim tekst trafi do AI, <b>PESEL, NIP, numer konta, adres i kontakt</b> zastępujemy znacznikami (pseudonimizacja, RODO).</li>
                <li>• Kwoty i uprawnienia liczy wyłącznie silnik zgodny z ustawą – AI tylko odczytuje pola.</li>
                <li>• AI możesz wyłączyć w Ustawieniach → Konto.</li>
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>

      <div ref={resultRef} className="scroll-mt-20">
        <AnimatePresence>{res && <Result res={res} onJson={() => setJsonOpen(true)} onLoad={loadToProfile} />}</AnimatePresence>
      </div>

      <Sheet open={jsonOpen} onOpenChange={setJsonOpen} title="Ustandaryzowany JSON dokumentu" description="Wynik ekstrakcji (parser regułowy + opcjonalnie AI) – wejście do silnika." wide>
        <pre className="overflow-x-auto rounded-xl bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-fg-2">{res && JSON.stringify(res.document, null, 2)}</pre>
        <h4 className="mt-5 mb-2 text-sm font-semibold">Odczytany tekst (podgląd)</h4>
        <pre className="max-h-80 overflow-auto rounded-xl bg-surface-2 p-4 font-mono text-[13px] whitespace-pre-wrap text-muted">{res?.textPreview || "— brak warstwy tekstowej —"}</pre>
      </Sheet>
    </div>
  );
}

function Result({ res, onJson, onLoad }: { res: AnalysisResponse; onJson: () => void; onLoad: () => void }) {
  const v = res.verdict;
  const d = res.document;
  const errors = res.issues.filter((i) => i.severity === "error");
  const warnings = res.issues.filter((i) => i.severity === "warning");
  const infos = res.issues.filter((i) => i.severity === "info");
  const fields: [string, string | number | null | undefined, string][] = [
    ["Rodzaj druku", FORM_NAMES[d.formType], "formType"],
    ["Ubezpieczony", [d.insured.firstName, d.insured.lastName].filter(Boolean).join(" ") || null, "insured.lastName"],
    ["PESEL", d.insured.pesel, "insured.pesel"],
    ["Płatnik", d.payer.name, "payer.name"],
    ["NIP płatnika", d.payer.nip, "payer.nip"],
    ["Liczba ubezpieczonych", d.payer.insuredCount, "payer.insuredCount"],
    ["Tytuł ubezpieczenia", d.title, "title"],
    ["Dobrowolne chorobowe", d.voluntarySickness === null ? null : d.voluntarySickness ? "tak" : "nie", "voluntarySickness"],
    ["Ubezpieczenie od / do", [d.insuranceStart, d.insuranceEnd].filter(Boolean).join(" → ") || null, "insuranceStart"],
    ["Miesiące wynagrodzeń", d.incomeMonths.length || null, "incomeMonths"],
    ["Termin / data porodu", d.child.birthDate ?? d.child.dueDate, "child.dueDate"],
    ["Zwolnienia e-ZLA", d.sickLeaves.length ? d.sickLeaves.map((l) => `${l.from}–${l.to}${l.codeB ? " (B)" : ""}`).join(", ") : null, "sickLeaves"],
    ["Zadłużenie", d.contributionDebt !== null ? zl(d.contributionDebt) : null, "contributionDebt"],
    ["Podpis", d.signed ? "obecny" : "brak", "signed"],
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 28 }} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
        <FileText className="h-4 w-4" /> <span className="font-medium text-fg">{res.fileName}</span> · {res.extraction.pages} str. · {res.extraction.chars} znaków · {res.extraction.durationMs} ms ·
        {res.extraction.aiUsed ? <AiBadge /> : <Badge>parser regułowy</Badge>}
        {res.extraction.scanned && <Badge tone="orange">skan</Badge>}
        <span className="text-[13px]">{res.extraction.aiNote}</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className={cn("relative overflow-hidden xl:col-span-2", v.insured ? "border-[color-mix(in_oklab,var(--green)_35%,transparent)]" : "border-[color-mix(in_oklab,var(--red)_35%,transparent)]")}>
          <CardBody className="relative pt-6">
            <div className="text-[13px] font-semibold tracking-wider text-muted uppercase">Werdykt silnika uprawnień</div>
            <div className="mt-2 flex items-center gap-3">
              {v.insured ? <ShieldCheck className="h-9 w-9 text-green" /> : <ShieldX className="h-9 w-9 text-red" />}
              <div>
                <div className={cn("text-[24px] font-semibold tracking-tight sm:text-[28px]", v.insured ? "text-green" : "text-red")}>Ubezpieczenie chorobowe: {v.insured ? "TAK" : "NIE"}</div>
                <div className="text-[15px] text-fg-2">{v.insuredLabel}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <LegalChip>{v.legalBasis}</LegalChip>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-[13px] text-muted">Kto wypłaca</div>
                <div className="text-[18px] font-semibold text-blue">{v.payer.includes("Zakład") ? "ZUS" : "Pracodawca"}</div>
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
                <div className="text-[13px] text-muted">Łącznie (mama)</div>
                <div className="num text-[18px] font-semibold">{v.insured ? zl(v.total) : "—"}</div>
              </div>
            </div>
            <p className="mt-4 text-[14px] text-muted">{v.payerReason} Podstawa wymiaru: {zl(v.base)} · stawka dzienna {zl(v.dailyBase)} · stawka {v.rateLabel}.</p>
            {v.blockedByDebt && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-soft px-4 py-3 text-[15px] text-red">
                <AlertOctagon className="h-4 w-4 shrink-0" /> <span><LegalText>Wypłata zablokowana do spłaty zadłużenia (art. 2a ustawy zasiłkowej) – prawo przedawnia się po 6 miesiącach.</LegalText></span>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={onLoad}>
                Otwórz w kalkulatorze <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="secondary" onClick={onJson}>
                <Braces className="h-3.5 w-3.5" /> JSON i tekst
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Braki formalne" subtitle="wg Załączników 1–7 rozporządzenia z 27.09.2026" icon={errors.length ? <XCircle className="h-4 w-4 text-red" /> : <CheckCircle2 className="h-4 w-4 text-green" />} action={<Badge tone={errors.length ? "red" : warnings.length ? "orange" : "green"}>{errors.length ? `${errors.length} błędy` : warnings.length ? `${warnings.length} uwagi` : "kompletny"}</Badge>} />
          <CardBody className="space-y-2">
            {[...errors, ...warnings, ...infos].map((i, k) => (
              <div key={k} className={cn("rounded-xl px-3 py-2 text-[14px]", i.severity === "error" ? "bg-red-soft text-red" : i.severity === "warning" ? "bg-orange-soft text-orange" : "bg-surface-2 text-fg-2")}>
                <div className="font-medium">{i.message}</div>
                {i.legal && <LegalChip className="mt-1.5">{i.legal}</LegalChip>}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Wyodrębnione dane" subtitle="Źródło każdego pola: parser regułowy lub AI" icon={<Braces className="h-4 w-4" />} />
        <CardBody>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {fields.map(([label, value, key]) => {
              const src = res.fieldSources[key] ?? Object.entries(res.fieldSources).find(([k]) => k.startsWith(key))?.[1];
              return (
                <div key={label} className="flex items-center justify-between gap-3 border-b border-line py-2 text-[14px]">
                  <span className="text-muted">{label}</span>
                  <span className="flex items-center gap-2 text-right">
                    <span className={cn("font-medium", value === null || value === undefined || value === "brak" ? "text-red" : "")}>{value ?? "nie znaleziono"}</span>
                    {src && <span className={cn("rounded px-1 text-[11px] font-semibold uppercase", src === "ai" ? "bg-gold-soft text-gold" : "bg-surface-3 text-muted")}>{src}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
}
