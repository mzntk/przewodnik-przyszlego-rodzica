"use client";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/store/app";
import { Field, Input, NumberInput, Select, Switch, Segmented } from "@/components/ui/form";
import { TITLE_LABELS, type InsuranceTitle, type ParentProfile } from "@/models/types";
import { buildIncomeHistory } from "@/data/profiles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Term } from "@/components/ui/term";
import { cn } from "@/lib/utils";
import { kidsOf } from "@/lib/child";
import type { KidInfo } from "@/models/types";

const TITLE_OPTIONS = (Object.keys(TITLE_LABELS) as InsuranceTitle[]).map((t) => ({ value: t, label: TITLE_LABELS[t] }));

/** Wyjaśnienie pola „Utrata pracy w ciąży” – zamiast tajemniczego „(wyrok)”. */
export const LOSS_INFO = {
  title: "Kiedy to zaznaczyć?",
  body: (
    <>
      <p>Tylko gdy straciłaś pracę w ciąży <b>nie ze swojej winy</b> – bo firma upadła, została zlikwidowana, pracodawca zmarł albo zwolnił Cię niezgodnie z prawem.</p>
      <p>
        <b>Zwolnienie niezgodne z prawem</b> to np. wypowiedzenie umowy kobiecie w ciąży. Liczy się dopiero wtedy, gdy <b>sąd pracy prawomocnym wyrokiem</b> uznał je za bezprawne (odwołanie składa się do sądu w 21 dni).
      </p>
      <p>W tych sytuacjach do porodu dostajesz zasiłek w wysokości zasiłku macierzyńskiego (100%), a po porodzie – zasiłek macierzyński.</p>
    </>
  ),
};
export const LOSS_HINT: Record<string, string> = {
  brak: "Zostaw „Nie dotyczy”, jeśli pracujesz albo sama złożyłaś wypowiedzenie.",
  upadlosc: "Potrzebne: świadectwo pracy z informacją o upadłości pracodawcy.",
  likwidacja: "Potrzebne: świadectwo pracy z informacją o likwidacji pracodawcy.",
  smierc_pracodawcy: "Dotyczy pracodawcy będącego osobą fizyczną (np. jednoosobowa firma).",
  bezprawne_zwolnienie: "Potrzebne: prawomocny wyrok sądu pracy. Sam fakt zwolnienia w ciąży nie wystarczy.",
};

const MIN_WAGE = 4806;
const INCOME_PRESETS = [
  { label: "Płaca minimalna", value: MIN_WAGE },
  { label: "6 000 zł", value: 6000 },
  { label: "8 000 zł", value: 8000 },
  { label: "10 000 zł", value: 10000 },
];

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
      <Field
        label="Tytuł ubezpieczenia"
        className="sm:col-span-2"
        info={{ title: "Skąd to wiem?", body: <><p>To rodzaj umowy, na podstawie której jesteś w ZUS: umowa o pracę, zlecenie, własna firma…</p><p>Sprawdzisz to w <b>PUE/eZUS → Panel Ubezpieczonego → Dane o ubezpieczeniach</b> albo na swojej umowie.</p></> }}
      >
        <Select value={p.title} onChange={(v) => up((x) => void (x.title = v))} options={TITLE_OPTIONS} />
      </Field>
      {voluntaryTitle && (
        <div className="sm:col-span-2 rounded-xl border border-line bg-surface-2 p-3">
          <Switch checked={p.voluntarySickness} onCheckedChange={(v) => up((x) => void (x.voluntarySickness = v))} label="Dobrowolne ubezpieczenie chorobowe" description="Bez niego nie ma zasiłku chorobowego ani macierzyńskiego (art. 11 ust. 2 u.s.u.s.)." />
        </div>
      )}
      <Field
        label="Ubezpieczenie chorobowe nieprzerwanie od"
        hint="Okres wyczekiwania: 30 dni (obowiązkowe) / 90 dni (dobrowolne)"
        info={{ title: "Jaką datę wpisać?", body: <><p>Dzień, od którego bez przerwy masz ubezpieczenie chorobowe – zwykle pierwszy dzień obecnej umowy albo dzień zgłoszenia firmy do ZUS.</p><p>Znajdziesz ją w <b>PUE/eZUS → Dane z ZUS → Zgłoszenia do ubezpieczeń</b> (druk ZUA). Przerwa krótsza niż 30 dni między umowami nie zeruje stażu.</p></> }}
      >
        <Input type="date" value={p.insuranceStart} onChange={(e) => up((x) => void (x.insuranceStart = e.target.value))} />
      </Field>
      {!jdg && (
        <Field
          label={employee ? "Ilu ubezpieczonych ma pracodawca?" : "Ilu ubezpieczonych ma zleceniodawca?"}
          className="sm:col-span-2"
          hint={(p.payer?.insuredCount ?? 0) > 20 ? "Zasiłek wypłaci pracodawca – dokumenty składasz w kadrach." : "Zasiłek wypłaci ZUS – pracodawca przekaże mu zaświadczenie Z-3."}
          info={{
            title: "Skąd wziąć tę liczbę?",
            body: (
              <>
                <p>Chodzi o liczbę osób, które firma zgłaszała do <b>ubezpieczenia chorobowego</b> według stanu na <b>30 listopada poprzedniego roku</b> – nie tylko pracowników na etacie.</p>
                <p>Najprościej: zapytaj <b>kadry lub księgowość</b> „czy zasiłki wypłaca u nas firma, czy ZUS?”. Wystarczy odpowiedź „do 20” albo „ponad 20” – dokładna liczba nie jest potrzebna.</p>
                <p>Mała firma (rodzinna, kilkuosobowa) prawie zawsze ma 20 lub mniej.</p>
              </>
            ),
          }}
        >
          <Segmented
            className="flex w-full"
            value={(p.payer?.insuredCount ?? 0) > 20 ? "duza" : "mala"}
            onChange={(v) => up((x) => void (x.payer = { name: x.payer?.name ?? "", nip: x.payer?.nip ?? "", insuredCount: v === "duza" ? Math.max(21, x.payer?.insuredCount ?? 0) : Math.min(20, Math.max(1, x.payer?.insuredCount ?? 1)) }))}
            options={[
              { value: "mala", label: "20 osób lub mniej" },
              { value: "duza", label: "Więcej niż 20" },
            ]}
          />
        </Field>
      )}
      {employee && (
        <Field label="Wymiar etatu">
          <Select value={String(p.workTimeFraction)} onChange={(v) => up((x) => void (x.workTimeFraction = Number(v)))} options={[{ value: "1", label: "Pełny etat" }, { value: "0.75", label: "3/4 etatu" }, { value: "0.5", label: "1/2 etatu" }, { value: "0.25", label: "1/4 etatu" }]} />
        </Field>
      )}
      <Field
        label={jdg ? "Zadeklarowana podstawa składek (mies.)" : employee ? "Średnie wynagrodzenie brutto (mies.)" : "Przychód ze zlecenia (mies.)"}
        className="sm:col-span-2"
        hint="Wystarczy przybliżona kwota – ustawimy ją dla 12 miesięcy. Miesiące z inną kwotą poprawisz w kalkulatorze („Podstawa”)."
        info={{
          title: "Skąd wziąć kwotę?",
          body: jdg ? (
            <p>To kwota, od której płacisz składki (nie przychód firmy). Znajdziesz ją w deklaracji <b>ZUS DRA</b> albo w <b>PUE/eZUS → Dane z ZUS → Podstawy wymiaru</b>.</p>
          ) : (
            <>
              <p>Kwota <b>brutto</b> (przed podatkiem i składkami) – jest na pasku wynagrodzenia albo w umowie.</p>
              <p>Masz różne kwoty co miesiąc? Weź roczny przychód z <b>PIT-11</b> i podziel przez 12. Dane pobrane z ZUS uzupełniamy automatycznie.</p>
            </>
          ),
        }}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {INCOME_PRESETS.map((x) => (
            <button
              key={x.label}
              type="button"
              onClick={() =>
                up((y) => {
                  y.incomeHistory = y.incomeHistory.length ? y.incomeHistory.map((m) => ({ ...m, gross: x.value, fixedContract: x.value })) : buildIncomeHistory(new Date().toISOString().slice(0, 7), 12, x.value);
                  if (jdg) y.declaredBase = x.value;
                })
              }
              className={cn("rounded-full border px-3 py-1 text-[13px] font-medium transition-colors", avg === x.value ? "border-brand bg-brand-soft text-brand" : "border-line text-fg-2 hover:border-brand")}
            >
              {x.label}
            </button>
          ))}
        </div>
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
        <Field label="Zadłużenie składkowe na dzień powstania prawa" hint="Próg blokady: 1% płacy minimalnej (art. 2a)" info={{ title: "Jak to sprawdzić?", body: <p>W <b>PUE/eZUS → Płatnik → Stan rozliczeń</b> albo zamawiając zaświadczenie o niezaleganiu. Zaległość powyżej 48,06 zł blokuje wypłatę zasiłku do czasu spłaty.</p> }}>
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
        <NumberInput value={c.childrenCount} min={1} max={6} onChange={(v) => up((x) => ((x.childrenCount = Math.max(1, Math.min(6, v))), (x.kids = kidsOf(x))))} />
      </Field>
      <div className="sm:col-span-2">
        <KidsEditor />
      </div>
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

const SEX_OPTIONS = [
  { value: "dziewczynka" as const, label: "Dziewczynka" },
  { value: "chlopiec" as const, label: "Chłopiec" },
  { value: "nie_wiem" as const, label: "Jeszcze nie wiem" },
];

/** Płeć i imię – osobno dla każdego dziecka. Imię zmienisz w każdej chwili w Ustawieniach. */
export function KidsEditor() {
  const { data, setData } = useApp();
  const kids = kidsOf(data.child);
  const set = (i: number, patch: Partial<KidInfo>) => setData((d) => ((d.child.kids = kidsOf(d.child)), (d.child.kids[i] = { ...d.child.kids[i], ...patch }), d));
  const many = kids.length > 1;
  const bio = data.child.path === "biologiczny";
  return (
    <div className="space-y-3">
      {kids.map((k, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-line bg-surface-2 p-3">
          {many && <div className="text-[14px] font-bold text-fg-2">Dziecko {i + 1}</div>}
          {bio && (
            <Field label="Czy znasz płeć dziecka?">
              <Segmented className="flex w-full" value={k.sex ?? "nie_wiem"} onChange={(v) => set(i, { sex: v })} options={SEX_OPTIONS} />
            </Field>
          )}
          <Field label={many ? `Jak mamy zwracać się do dziecka ${i + 1}?` : "Jak mamy zwracać się do Twojego dziecka?"} hint="Wpisz wybrane imię – użyjemy go w aplikacji. Możesz je zmienić w każdej chwili w Ustawieniach.">
            <Input value={k.name ?? ""} maxLength={30} placeholder={k.sex === "chlopiec" ? "np. Staś" : k.sex === "dziewczynka" ? "np. Zosia" : "np. Zosia albo Staś – albo zostaw puste"} onChange={(e) => set(i, { name: e.target.value || undefined })} />
          </Field>
        </div>
      ))}
    </div>
  );
}

/** Dane po urodzeniu – posłużą do automatycznego wypełniania dokumentów (USC, ZCNA, 800+, ZAM, wnioski urlopowe). */
export function BirthDetails() {
  const { data, setData } = useApp();
  const c = data.child;
  const kids = kidsOf(c);
  const fallbackLast = data.father?.lastName || data.mother.lastName;
  const set = (i: number, patch: Partial<KidInfo>) =>
    setData((d) => {
      d.child.kids = kidsOf(d.child);
      d.child.kids[i] = { ...d.child.kids[i], ...patch };
      if (patch.weightG !== undefined) d.child.birthWeightsG = d.child.kids.map((k) => k.weightG ?? 0).filter(Boolean);
      return d;
    });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data urodzenia">
          <Input type="date" value={c.birthDate ?? ""} onChange={(e) => setData((d) => ((d.child.birthDate = e.target.value || undefined), d))} />
        </Field>
        <Field label="Tydzień ciąży w dniu porodu" hint="Poniżej 37. tygodnia może przysługiwać urlop uzupełniający">
          <NumberInput value={c.gestationWeek ?? 40} min={22} max={43} suffix="tydz." onChange={(v) => setData((d) => ((d.child.gestationWeek = v), d))} />
        </Field>
      </div>
      {kids.map((k, i) => (
        <div key={i} className="grid gap-3 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-2">
          <div className="text-[14px] font-bold text-fg-2 sm:col-span-2">{kids.length > 1 ? `Dziecko ${i + 1}` : "Dziecko"}{k.name ? ` – ${k.name}` : ""}</div>
          <Field label="Imię (imiona) – jak w akcie urodzenia">
            <Input value={k.fullName ?? ""} placeholder={k.name ? `np. ${k.name}` : "np. Zofia Maria"} onChange={(e) => set(i, { fullName: e.target.value || undefined })} />
          </Field>
          <Field label="Nazwisko">
            <Input value={k.lastName ?? ""} placeholder={fallbackLast} onChange={(e) => set(i, { lastName: e.target.value || undefined })} />
          </Field>
          <Field label="Płeć">
            <Segmented className="flex w-full" value={k.sex === "chlopiec" ? "chlopiec" : k.sex === "dziewczynka" ? "dziewczynka" : "nie_wiem"} onChange={(v) => set(i, { sex: v })} options={SEX_OPTIONS.slice(0, 2).concat({ value: "nie_wiem", label: "—" })} />
          </Field>
          <Field label="Godzina urodzenia">
            <Input type="time" value={k.birthTime ?? ""} onChange={(e) => set(i, { birthTime: e.target.value || undefined })} />
          </Field>
          <Field label="Masa urodzeniowa">
            <NumberInput value={k.weightG ?? 0} step={10} suffix="g" onChange={(v) => set(i, { weightG: v || undefined })} />
          </Field>
          <Field label="Miejsce urodzenia (szpital, miasto)">
            <Input value={k.birthPlace ?? ""} placeholder="np. Szpital św. Zofii, Warszawa" onChange={(e) => set(i, { birthPlace: e.target.value || undefined })} />
          </Field>
          <Field label="PESEL dziecka (po rejestracji w USC)" className="sm:col-span-2" hint="Nadaje go urząd przy rejestracji urodzenia. Wpisz, gdy go dostaniesz – uzupełni ZCNA, 800+ i ZAM.">
            <Input inputMode="numeric" maxLength={11} value={k.pesel ?? ""} placeholder="11 cyfr" onChange={(e) => set(i, { pesel: e.target.value.replace(/\D/g, "") || undefined })} />
          </Field>
        </div>
      ))}
    </div>
  );
}
