"use client";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/store/app";
import { Field, Input, NumberInput, Select, Switch, Segmented } from "@/components/ui/form";
import { TITLE_LABELS, type InsuranceTitle, type ParentProfile } from "@/models/types";
import { buildIncomeHistory } from "@/data/profiles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Term } from "@/components/ui/term";

const TITLE_OPTIONS = (Object.keys(TITLE_LABELS) as InsuranceTitle[]).map((t) => ({ value: t, label: TITLE_LABELS[t] }));

export function ParentEditor({ who }: { who: "mother" | "father" }) {
  const { data, setData } = useApp();
  const p = who === "mother" ? data.mother : data.father;
  if (!p) return null;
  const up = (fn: (x: ParentProfile) => void) =>
    setData((d) => {
      const target = who === "mother" ? d.mother : d.father!;
      fn(target);
      return d;
    });
  const avg = p.incomeHistory.length ? Math.round(p.incomeHistory.reduce((s, m) => s + m.gross, 0) / p.incomeHistory.length) : 0;
  const voluntaryTitle = ["zlecenie", "jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(p.title);
  const jdg = ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(p.title);
  const employee = p.title === "uop";

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Imię">
        <Input value={p.firstName} onChange={(e) => up((x) => void (x.firstName = e.target.value))} />
      </Field>
      <Field label="Nazwisko">
        <Input value={p.lastName} onChange={(e) => up((x) => void (x.lastName = e.target.value))} />
      </Field>
      <Field label="Tytuł ubezpieczenia" className="sm:col-span-2">
        <Select value={p.title} onChange={(v) => up((x) => void (x.title = v))} options={TITLE_OPTIONS} />
      </Field>
      {voluntaryTitle && (
        <div className="sm:col-span-2 rounded-xl border border-line bg-surface-2 p-3">
          <Switch checked={p.voluntarySickness} onCheckedChange={(v) => up((x) => void (x.voluntarySickness = v))} label="Dobrowolne ubezpieczenie chorobowe" description="Bez niego nie ma zasiłku chorobowego ani macierzyńskiego (art. 11 ust. 2 u.s.u.s.)." />
        </div>
      )}
      <Field label="Ubezpieczenie chorobowe nieprzerwanie od" hint="Okres wyczekiwania: 30 dni (obowiązkowe) / 90 dni (dobrowolne)">
        <Input type="date" value={p.insuranceStart} onChange={(e) => up((x) => void (x.insuranceStart = e.target.value))} />
      </Field>
      {!jdg && (
        <Field label="Liczba ubezpieczonych u płatnika (30.11)" hint="> 20 – zasiłek wypłaca płatnik; ≤ 20 – ZUS">
          <NumberInput value={p.payer?.insuredCount ?? 0} min={0} onChange={(v) => up((x) => void (x.payer = { name: x.payer?.name ?? "", nip: x.payer?.nip ?? "", insuredCount: v }))} suffix="os." />
        </Field>
      )}
      {employee && (
        <Field label="Wymiar etatu">
          <Select value={String(p.workTimeFraction)} onChange={(v) => up((x) => void (x.workTimeFraction = Number(v)))} options={[{ value: "1", label: "Pełny etat" }, { value: "0.75", label: "3/4 etatu" }, { value: "0.5", label: "1/2 etatu" }, { value: "0.25", label: "1/4 etatu" }]} />
        </Field>
      )}
      <Field label={jdg ? "Zadeklarowana podstawa składek (mies.)" : employee ? "Średnie wynagrodzenie brutto (mies.)" : "Przychód ze zlecenia (mies.)"} hint="Ustawia jednakową kwotę dla 12 miesięcy – szczegóły w zakładce „Podstawa”.">
        <NumberInput
          value={avg}
          step={100}
          suffix="zł"
          onChange={(v) =>
            up((x) => {
              x.incomeHistory = x.incomeHistory.length ? x.incomeHistory.map((m) => ({ ...m, gross: v, fixedContract: v })) : buildIncomeHistory(new Date().toISOString().slice(0, 7), 12, v);
              if (jdg) x.declaredBase = v;
            })
          }
        />
      </Field>
      {jdg && (
        <Field label="Zadłużenie składkowe na dzień powstania prawa" hint="Próg blokady: 1% płacy minimalnej (art. 2a)">
          <NumberInput value={p.contributionDebt ?? 0} step={10} suffix="zł" onChange={(v) => up((x) => void (x.contributionDebt = v))} />
        </Field>
      )}
      {employee && (
        <Field label="Umowa na czas określony do (opcjonalnie)" hint="Art. 177 § 3 KP – przedłużenie do dnia porodu">
          <Input type="date" value={p.contractEndDate ?? ""} onChange={(e) => up((x) => void (x.contractEndDate = e.target.value || undefined))} />
        </Field>
      )}
    </div>
  );
}

export function ChildEditor() {
  const { data, setData } = useApp();
  const c = data.child;
  const up = (fn: (x: typeof c) => void) => setData((d) => (fn(d.child), d));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Sytuacja" className="sm:col-span-2">
        <Segmented
          value={c.path}
          onChange={(v) => up((x) => void (x.path = v))}
          className="flex w-full"
          options={[
            { value: "biologiczny", label: "Narodziny" },
            { value: "adopcja", label: "Adopcja" },
            { value: "rodzina_zastepcza", label: "Rodzina zastępcza" },
          ]}
        />
      </Field>
      <Field label={c.path === "biologiczny" ? "Przewidywana data porodu" : "Data przyjęcia dziecka"}>
        <Input type="date" value={c.dueDate} onChange={(e) => up((x) => void (x.dueDate = e.target.value))} />
      </Field>
      {c.path === "biologiczny" ? (
        <Field label="Faktyczna data porodu (jeśli już był)">
          <Input type="date" value={c.birthDate ?? ""} onChange={(e) => up((x) => void (x.birthDate = e.target.value || undefined))} />
        </Field>
      ) : (
        <Field label="Wiek dziecka w dniu przyjęcia" hint={c.path === "adopcja" ? "Limit: 14 lat" : "Limit: 7 lat (10 przy odroczeniu obowiązku szkolnego)"}>
          <NumberInput value={c.childAgeYears ?? 0} min={0} max={18} suffix="lat" onChange={(v) => up((x) => void (x.childAgeYears = v))} />
        </Field>
      )}
      <Field label="Liczba dzieci (jeden poród / jednoczesne przyjęcie)">
        <NumberInput value={c.childrenCount} min={1} max={6} onChange={(v) => up((x) => void (x.childrenCount = Math.max(1, Math.min(6, v))))} />
      </Field>
      {c.path === "biologiczny" && (
        <Field label="Planowany poród">
          <Select value={c.delivery ?? "naturalny"} onChange={(v) => up((x) => void (x.delivery = v))} options={[{ value: "naturalny", label: "Siłami natury" }, { value: "cesarskie", label: "Cesarskie cięcie" }]} />
        </Field>
      )}
      <div className="sm:col-span-2 space-y-3 rounded-xl border border-line bg-surface-2 p-3">
        <Switch checked={c.zaZyciem} onCheckedChange={(v) => up((x) => void (x.zaZyciem = v))} label={<Term id="za-zyciem" />} description="Ciężkie i nieodwracalne upośledzenie lub nieuleczalna choroba – rodzicielski 65/67 tyg." />
        {c.path === "rodzina_zastepcza" && <Switch checked={!!c.schoolDeferred} onCheckedChange={(v) => up((x) => void (x.schoolDeferred = v))} label="Odroczony obowiązek szkolny" description="Limit wieku dziecka wydłuża się do 10 lat." />}
      </div>
    </div>
  );
}

export function SickLeaveEditor() {
  const { data, setData } = useApp();
  const leaves = data.mother.sickLeaves;
  return (
    <div className="space-y-2">
      {leaves.map((l, i) => (
        <div key={l.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2 rounded-xl border border-line bg-surface-2 p-2.5">
          <Field label="Od">
            <Input type="date" value={l.from} onChange={(e) => setData((d) => ((d.mother.sickLeaves[i].from = e.target.value), d))} />
          </Field>
          <Field label="Do">
            <Input type="date" value={l.to} onChange={(e) => setData((d) => ((d.mother.sickLeaves[i].to = e.target.value), d))} />
          </Field>
          <button
            onClick={() => setData((d) => ((d.mother.sickLeaves[i].codeB = !l.codeB), d))}
            className="h-10 rounded-xl px-3 text-[13px] font-semibold"
            aria-label="Kod B"
          >
            <Badge tone={l.codeB ? "green" : "neutral"}>{l.codeB ? "Kod B" : "bez B"}</Badge>
          </button>
          <button onClick={() => setData((d) => ((d.mother.sickLeaves = d.mother.sickLeaves.filter((_, j) => j !== i)), d))} className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-surface-3 hover:text-red" aria-label="Usuń zwolnienie">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          setData((d) => {
            const last = d.mother.sickLeaves.at(-1)?.to ?? new Date().toISOString().slice(0, 10);
            const from = new Date(Date.parse(last) + 86400000 * 2).toISOString().slice(0, 10);
            d.mother.sickLeaves.push({ id: `z${Date.now()}`, from, to: new Date(Date.parse(from) + 86400000 * 13).toISOString().slice(0, 10), codeB: true });
            return d;
          })
        }
      >
        <Plus className="h-4 w-4" /> Dodaj zwolnienie e-ZLA
      </Button>
    </div>
  );
}
