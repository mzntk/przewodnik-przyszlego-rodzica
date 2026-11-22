"use client";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ExtractedDocument } from "@/models/document";
import { TITLE_LABELS, type InsuranceTitle } from "@/models/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

/** Źródło wartości pola: z którego dokumentu teczki, czy odczytało AI, czy poprawiono ręcznie. */
export type FieldSource = { label: string; tone: "doc" | "ai" | "edited" | "missing" };

type Kind = "text" | "date" | "number" | "bool" | "title";
type FieldDef = { path: string; label: string; kind: Kind; step?: number; hint?: string };

const GROUPS: { title: string; info?: string; fields: FieldDef[] }[] = [
  {
    title: "Osoba ubezpieczona",
    fields: [
      { path: "insured.firstName", label: "Imię", kind: "text" },
      { path: "insured.lastName", label: "Nazwisko", kind: "text" },
      { path: "insured.pesel", label: "PESEL", kind: "text", hint: "Płeć z PESEL decyduje, czy liczymy dla mamy, czy taty." },
    ],
  },
  {
    title: "Ubezpieczenie chorobowe",
    info: "Te pola decydują, czy osoba ma prawo do zasiłku. Źródło: poświadczenie ubezpieczenia, zrzut z systemu ZUS albo zaświadczenie płatnika (Z-3 / Z-3a).",
    fields: [
      { path: "title", label: "Tytuł ubezpieczenia", kind: "title" },
      { path: "voluntarySickness", label: "Dobrowolne chorobowe", kind: "bool", hint: "Dotyczy zlecenia i działalności – przy umowie o pracę chorobowe jest obowiązkowe." },
      { path: "insuranceStart", label: "Ubezpieczenie od", kind: "date" },
      { path: "insuranceEnd", label: "Ubezpieczenie / umowa do", kind: "date", hint: "Puste = trwa. Koniec przed porodem (poza umową o pracę) oznacza brak zasiłku macierzyńskiego." },
      { path: "contributionDebt", label: "Zadłużenie w składkach (zł)", kind: "number", step: 0.01, hint: "Przy działalności zaległość powyżej 1% minimalnego wynagrodzenia blokuje wypłatę (art. 2a)." },
    ],
  },
  {
    title: "Płatnik i podstawa",
    info: "Podstawę wymiaru liczymy z wynagrodzeń z 12 miesięcy (Z-3 / Z-3a) albo z zadeklarowanej podstawy składek (działalność).",
    fields: [
      { path: "payer.name", label: "Płatnik składek", kind: "text" },
      { path: "payer.insuredCount", label: "Liczba ubezpieczonych u płatnika", kind: "number", hint: "Do 20 osób zasiłek wypłaca ZUS, powyżej – pracodawca (art. 61)." },
      { path: "workTimeFraction", label: "Wymiar etatu", kind: "number", step: 0.05, hint: "1 = pełny etat, 0,5 = pół etatu." },
      { path: "declaredBase", label: "Zadeklarowana podstawa składek (zł)", kind: "number", step: 0.01 },
    ],
  },
  {
    title: "Dziecko i wniosek",
    fields: [
      { path: "child.dueDate", label: "Przewidywana data porodu", kind: "date" },
      { path: "child.birthDate", label: "Data urodzenia / przyjęcia", kind: "date" },
      { path: "child.childrenCount", label: "Liczba dzieci przy jednym porodzie", kind: "number" },
      { path: "child.adoption", label: "Adopcja / rodzina zastępcza", kind: "bool" },
      { path: "child.gestationWeek", label: "Tydzień ciąży przy porodzie", kind: "number", hint: "Do 28. tygodnia (lub < 1000 g) – macierzyński uzupełniający do 8 tyg." },
      { path: "child.birthWeightG", label: "Masa urodzeniowa (g)", kind: "number" },
      { path: "child.hospitalizationDays", label: "Dni pobytu dziecka w szpitalu", kind: "number" },
      { path: "benefit.variant815", label: "Wniosek o 81,5% za cały rok", kind: "bool" },
    ],
  },
];

export function getPath(o: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o);
}
export function setPath<T>(o: T, path: string, v: unknown): T {
  const copy = structuredClone(o) as Record<string, unknown>;
  const keys = path.split(".");
  let cur = copy;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys.at(-1)!] = v;
  return copy as T;
}

const inputCls = "h-10 w-full rounded-lg border bg-white px-3 text-[15px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

function SourceChip({ s }: { s: FieldSource }) {
  return <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase", s.tone === "edited" ? "bg-blue-soft text-blue" : s.tone === "ai" ? "bg-gold-soft text-gold" : s.tone === "missing" ? "bg-red-soft text-red" : "bg-surface-3 text-muted")}>{s.label}</span>;
}

function FieldInput({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const empty = value === null || value === undefined || value === "";
  const cls = cn(inputCls, empty ? "border-orange/60 bg-orange-soft/40" : "border-line");
  if (def.kind === "title")
    return (
      <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} className={cls} aria-label={def.label}>
        <option value="">— nie odczytano —</option>
        {(Object.keys(TITLE_LABELS) as InsuranceTitle[]).map((t) => (
          <option key={t} value={t}>
            {TITLE_LABELS[t]}
          </option>
        ))}
      </select>
    );
  if (def.kind === "bool")
    return (
      <select value={value === null || value === undefined ? "" : value ? "1" : "0"} onChange={(e) => onChange(e.target.value === "" ? null : e.target.value === "1")} className={cls} aria-label={def.label}>
        <option value="">— nie odczytano —</option>
        <option value="1">tak</option>
        <option value="0">nie</option>
      </select>
    );
  if (def.kind === "number")
    return <input type="number" inputMode="decimal" step={def.step ?? 1} value={empty ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className={cn(cls, "num")} aria-label={def.label} placeholder="brak" />;
  return <input type={def.kind === "date" ? "date" : "text"} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} className={cls} aria-label={def.label} placeholder="brak" />;
}

/** Edytowalne dane sprawy odczytane z dokumentów – każda zmiana od razu przelicza werdykt silnika. */
export function CaseDataEditor({ doc, onChange, sourceOf, edited, onReset }: { doc: ExtractedDocument; onChange: (path: string, v: unknown) => void; sourceOf: (path: string) => FieldSource; edited: boolean; onReset: () => void }) {
  const months = doc.incomeMonths;
  const setMonths = (m: ExtractedDocument["incomeMonths"]) => onChange("incomeMonths", m);
  const monthsSrc = sourceOf("incomeMonths");

  return (
    <Card>
      <CardHeader
        title="Dane sprawy – sprawdź i popraw"
        subtitle="Odczytane z dokumentów. Popraw źle odczytane pole albo uzupełnij brakujące – wynik przeliczy się od razu."
        icon={<Pencil className="h-4 w-4" />}
        action={
          edited ? (
            <Button size="sm" variant="ghost" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" /> Cofnij poprawki
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {GROUPS.map((g) => (
            <fieldset key={g.title} className="min-w-0 space-y-2.5">
              <legend className="mb-1 flex items-center gap-1.5 text-[14px] font-bold text-fg-2">
                {g.title}
                {g.info && <InfoTip title={g.title}>{g.info}</InfoTip>}
              </legend>
              {g.fields.map((f) => {
                const src = sourceOf(f.path);
                return (
                  <label key={f.path} className="grid gap-1 sm:grid-cols-[minmax(0,44%)_1fr] sm:items-center sm:gap-3">
                    <span className="flex items-center gap-1.5 text-[14px] text-fg-2">
                      {f.label}
                      {f.hint && <InfoTip title={f.label}>{f.hint}</InfoTip>}
                    </span>
                    <span className="flex items-center gap-2">
                      <FieldInput def={f} value={getPath(doc, f.path)} onChange={(v) => onChange(f.path, v)} />
                      <SourceChip s={src} />
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-bold text-fg-2">Wynagrodzenie / przychód z poszczególnych miesięcy</span>
            <InfoTip title="Miesiące do podstawy">Z zaświadczenia płatnika (Z-3 / Z-3a). Kwoty brutto. Dni: przepracowane / obowiązujące – miesiąc, w którym przepracowano mniej niż połowę dni, jest wyłączany, a niepełny – uzupełniany (art. 38).</InfoTip>
            <SourceChip s={monthsSrc} />
          </div>
          {months.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-[14px]">
                <thead>
                  <tr className="text-left text-[13px] text-muted">
                    <th className="py-1 pr-2 font-medium">Miesiąc</th>
                    <th className="py-1 pr-2 font-medium">Brutto (zł)</th>
                    <th className="py-1 pr-2 font-medium">Dni przepracowane</th>
                    <th className="py-1 pr-2 font-medium">Dni obowiązujące</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => {
                    const upd = (patch: Partial<(typeof months)[number]>) => setMonths(months.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    return (
                      <tr key={i}>
                        <td className="py-1 pr-2"><input type="month" value={m.month} onChange={(e) => upd({ month: e.target.value })} className={cn(inputCls, "border-line")} aria-label="Miesiąc" /></td>
                        <td className="py-1 pr-2"><input type="number" step={0.01} value={m.gross} onChange={(e) => upd({ gross: Number(e.target.value) })} className={cn(inputCls, "num border-line")} aria-label="Brutto" /></td>
                        <td className="py-1 pr-2"><input type="number" value={m.workedDays ?? ""} onChange={(e) => upd({ workedDays: e.target.value === "" ? null : Number(e.target.value) })} className={cn(inputCls, "num border-line")} aria-label="Dni przepracowane" placeholder="—" /></td>
                        <td className="py-1 pr-2"><input type="number" value={m.requiredDays ?? ""} onChange={(e) => upd({ requiredDays: e.target.value === "" ? null : Number(e.target.value) })} className={cn(inputCls, "num border-line")} aria-label="Dni obowiązujące" placeholder="—" /></td>
                        <td className="py-1">
                          <button type="button" onClick={() => setMonths(months.filter((_, j) => j !== i))} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-soft hover:text-red" aria-label={`Usuń ${m.month}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => {
              const last = months.at(-1)?.month;
              const next = last ? new Date(Date.UTC(+last.slice(0, 4), +last.slice(5, 7), 1)).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
              setMonths([...months, { month: next, gross: months.at(-1)?.gross ?? 0, workedDays: null, requiredDays: null }]);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj miesiąc
          </Button>
          {months.length === 0 && <p className="mt-2 text-[14px] text-muted">Brak miesięcy w dokumentach – dodaj je ręcznie albo dołącz Z-3 / Z-3a. Bez nich liczymy od podstawy minimalnej.</p>}
        </div>
      </CardBody>
    </Card>
  );
}
