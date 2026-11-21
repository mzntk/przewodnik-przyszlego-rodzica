"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Annoyed, BookOpen, Briefcase, CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, Clock, Download, Frown, Laugh, Lightbulb, MapPin, Meh, Pencil, Smile, Stethoscope, Trash2, Users } from "lucide-react";
import Link from "next/link";

const MOOD_ICONS = [Frown, Annoyed, Meh, Smile, Laugh];

function MoodMark({ mood }: { mood: number }) {
  const Icon = MOOD_ICONS[mood - 1];
  return <Icon className="h-3 w-3 opacity-70" aria-label={MOODS[mood - 1]} />;
}
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EVENT_KINDS, useApp, type Appointment, type EventKind } from "@/store/app";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { useCalculation } from "@/hooks/use-calculation";
import { useToday } from "@/hooks/use-mounted";
import { PageHeader } from "@/components/ui/misc";
import { MotionTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChecklistTab, KnowledgeTab } from "@/components/organize/organize-view";
import { MILESTONES, MOODS, SYMPTOM_TAGS, pregnancyWeek, weekInfo } from "@/data/pregnancy";
import { buildFormPdf, downloadBytes } from "@/lib/pdf";
import { addDaysISO, cn, dLong, dPL } from "@/lib/utils";

type Tab = "kalendarz" | "listy" | "poradniki";
const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];

export function PregnancyView() {
  const { account, access, data } = useApp();
  const dad = account === "tata";
  const tabs = [
    ...(!dad || access.pregnancy ? [{ id: "kalendarz" as Tab, label: "Kalendarz", icon: <CalendarDays className="h-4 w-4" /> }] : []),
    ...(!dad || access.lists ? [{ id: "listy" as Tab, label: "Torba i wyprawka", icon: <Briefcase className="h-4 w-4" /> }] : []),
    { id: "poradniki" as Tab, label: "Poradniki i połóg", icon: <BookOpen className="h-4 w-4" /> },
  ];
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  const bio = data.child.path === "biologiczny";

  return (
    <div className="space-y-6">
      <PageHeader title={dad && !access.pregnancy ? "Przygotowania i wiedza" : bio ? "Kalendarz ciąży" : "Przygotowania na przyjęcie dziecka"} description={dad ? "Sekcje udostępnione przez mamę oraz wiedza dla przyszłego taty." : "Tydzień po tygodniu: jak się czujesz, co się zmienia, co Cię czeka – oraz listy i poradniki w jednym miejscu."} />
      <MotionTabs layoutId="preg-tab" value={tab} onChange={setTab} tabs={tabs} />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", stiffness: 320, damping: 30 }}>
          {tab === "kalendarz" ? <CalendarTab /> : tab === "listy" ? <ChecklistTab readOnly={false} /> : <KnowledgeTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface DayEvent {
  kind: "termin" | "wizyta" | "badanie" | "zus";
  title: string;
  id?: string;
  appt?: Appointment;
}

const blankEvent = (date: string, author: "mama" | "tata", kind: EventKind = "wizyta"): Appointment => ({ id: "", date, title: "", kind, time: "", place: "", note: "", shared: true, author });

/** Dodawanie i edycja wydarzenia w kalendarzu (wizyty, badania, szkoła rodzenia…). */
function EventSheet({ value, onClose }: { value: Appointment | null; onClose: () => void }) {
  const { addAppointment, updateAppointment, removeAppointment, account, access } = useApp();
  const [e, setE] = useState<Appointment | null>(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setE(value);
  }
  const dad = account === "tata";
  if (!e) return <Sheet open={false} onOpenChange={onClose} title="">{null}</Sheet>;
  const set = (patch: Partial<Appointment>) => setE({ ...e, ...patch });
  const title = e.title.trim() || EVENT_KINDS[e.kind ?? "inne"];
  function save() {
    if (!e) return;
    const item = { ...e, title };
    if (e.id) updateAppointment(item);
    else addAppointment({ ...item, id: `a${Date.now()}` });
    toast.success(e.id ? "Zapisano zmiany" : "Dodano do kalendarza", { description: !dad && e.shared && access.pregnancy ? "Partner zobaczy to wydarzenie w swoim kalendarzu." : undefined });
    onClose();
  }
  return (
    <Sheet open={!!value} onOpenChange={(v) => !v && onClose()} title={e.id ? "Edytuj wydarzenie" : "Nowe wydarzenie"} description="Wizyta, badanie, USG, szkoła rodzenia albo sprawa w urzędzie.">
      <form onSubmit={(ev) => (ev.preventDefault(), save())} className="space-y-4">
        <Field label="Rodzaj" htmlFor="ev-kind">
          <Select id="ev-kind" value={e.kind ?? "inne"} onChange={(v) => set({ kind: v })} options={(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => ({ value: k, label: EVENT_KINDS[k] }))} />
        </Field>
        <Field label="Nazwa (opcjonalnie)" htmlFor="ev-title">
          <Input id="ev-title" value={e.title} placeholder={`np. ${e.kind === "usg" ? "USG połówkowe" : e.kind === "polozna" ? "Wizyta edukacyjna u położnej" : "Kontrola u ginekologa"}`} onChange={(x) => set({ title: x.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data" htmlFor="ev-date">
            <Input id="ev-date" type="date" required value={e.date} onChange={(x) => set({ date: x.target.value })} />
          </Field>
          <Field label="Godzina" htmlFor="ev-time">
            <Input id="ev-time" type="time" value={e.time ?? ""} onChange={(x) => set({ time: x.target.value })} />
          </Field>
        </div>
        <Field label="Miejsce" htmlFor="ev-place">
          <Input id="ev-place" value={e.place ?? ""} placeholder="np. Przychodnia, ul. Puławska 145" onChange={(x) => set({ place: x.target.value })} />
        </Field>
        <Field label="Notatka" htmlFor="ev-note">
          <textarea id="ev-note" rows={2} value={e.note ?? ""} placeholder="Co zabrać, pytania do lekarza…" onChange={(x) => set({ note: x.target.value })} className="w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[15px] outline-none focus:border-brand" />
        </Field>
        {!dad ? (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <Switch id="ev-shared" checked={!!e.shared} onCheckedChange={(v) => set({ shared: v })} label={<span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand" /> Pokaż partnerowi</span>} description={access.pregnancy ? "Wydarzenie pojawi się w kalendarzu partnera – może je też edytować." : "Najpierw udostępnij partnerowi kalendarz ciąży (Ustawienia → Partner)."} />
          </div>
        ) : (
          <p className="rounded-xl bg-brand-soft px-3 py-2 text-[14px] text-fg-2">Wydarzenia, które dodasz, zobaczy też mama w swoim kalendarzu.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" className="flex-1">
            <CalendarPlus className="h-4 w-4" /> {e.id ? "Zapisz zmiany" : "Dodaj do kalendarza"}
          </Button>
          {e.id && (
            <Button type="button" variant="outline" onClick={() => (removeAppointment(e.id), toast.success("Usunięto wydarzenie"), onClose())}>
              <Trash2 className="h-4 w-4" /> Usuń
            </Button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

/** Położna i wizyty patronażowe – tu, gdzie planujesz wizyty, a nie na mapie. */
function MidwifeCard({ week, onPlan }: { week: number | null; onPlan: () => void }) {
  const soon = week !== null && week >= 18;
  return (
    <div className={cn("rounded-2xl border p-5", soon ? "border-brand bg-brand-soft" : "border-line bg-surface")}>
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-brand" />
        <h3 className="text-[17px] font-bold">Położna i wizyty patronażowe</h3>
      </div>
      <ul className="mt-3 space-y-1.5 text-[15px] leading-snug text-fg-2">
        <li>• <b>Od 21. tygodnia ciąży</b> wybierz położną POZ – składasz deklarację wyboru w przychodni (bezpłatnie). Od tego momentu przysługują Ci wizyty edukacyjne przed porodem.</li>
        <li>• <b>Po porodzie</b> położna przychodzi do domu na <b>4–6 wizyt patronażowych</b>. Pierwszą umawia zwykle w ciągu 48 godzin od wyjścia ze szpitala.</li>
        <li>• Podaj w szpitalu dane swojej położnej – szpital przekaże jej informację o porodzie.</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={onPlan}>
          <CalendarPlus className="h-4 w-4" /> Zaplanuj wizytę położnej
        </Button>
        <Link href="/placowki" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-3 text-[15px] font-bold hover:bg-surface-2">
          <MapPin className="h-4 w-4" /> Znajdź przychodnię POZ
        </Link>
      </div>
    </div>
  );
}

function CalendarTab() {
  const { data, account, access, dayLogs, setDayLog, appointments, epds } = useApp();
  const { result } = useCalculation();
  const today = useToday();
  const dad = account === "tata";
  const canSeeSymptoms = !dad || access.symptoms;
  const due = data.child.dueDate;
  const event = data.child.birthDate ?? due;
  const [cursor, setCursor] = useState(() => today.slice(0, 7));
  const [sel, setSel] = useState(today);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const author = dad ? "tata" : "mama";

  const weekStart = (w: number) => addDaysISO(due, -(40 - w) * 7);
  const events = useMemo(() => {
    const m: Record<string, DayEvent[]> = {};
    const push = (d: string, e: DayEvent) => (m[d] ??= []).push(e);
    push(event, { kind: "termin", title: data.child.birthDate ? "Dzień narodzin" : data.child.path === "biologiczny" ? "Termin porodu" : "Przyjęcie dziecka" });
    if (data.child.path === "biologiczny" && !data.child.birthDate) for (const ms of MILESTONES) push(weekStart(ms.week), { kind: "badanie", title: `${ms.title} (${ms.week}.–${ms.until}. tydz.)` });
    for (const a of appointments) if (!dad || a.shared || a.author === "tata") push(a.date, { kind: "wizyta", title: `${a.time ? `${a.time} · ` : ""}${a.title}`, id: a.id, appt: a });
    for (const d of result?.deadlines ?? []) if (!dad || d.who !== "matka") push(d.date, { kind: "zus", title: d.title });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, due, appointments, result, dad, data.child.path, data.child.birthDate]);

  const [y, mo] = cursor.split("-").map(Number);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${cursor}-${String(i + 1).padStart(2, "0")}`)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => {
    const d = new Date(Date.UTC(y, mo - 1 + n, 1));
    setCursor(d.toISOString().slice(0, 7));
  };

  const selWeek = data.child.path === "biologiczny" ? pregnancyWeek(due, sel, data.child.birthDate) : null;
  const selDayOfWeek = selWeek ? (Math.round((Date.parse(sel) - Date.parse(weekStart(selWeek))) / 86400000) + 7) % 7 : 0;
  const info = weekInfo(selWeek);
  const log = dayLogs[sel] ?? { tags: [] };
  const upcoming = appointments.filter((a) => a.date >= today && (!dad || a.shared || a.author === "tata")).slice(0, 4);
  const inWindow = (d: string) => MILESTONES.some((m) => d >= weekStart(m.week) && d < weekStart(m.until + 1));

  async function exportReport() {
    const days = Object.entries(dayLogs).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30);
    const bytes = await buildFormPdf({
      code: "RAPORT",
      title: "Dziennik ciąży – raport dla lekarza prowadzącego",
      addressee: "Lekarz prowadzący ciążę",
      legal: "Dane wprowadzone samodzielnie przez pacjentkę w aplikacji – nie stanowią dokumentacji medycznej.",
      fields: [
        { label: "Pacjentka", value: `${data.mother.firstName} ${data.mother.lastName}` },
        { label: "Termin porodu / tydzień ciąży", value: `${dPL(due)} · ${pregnancyWeek(due, today, data.child.birthDate) ?? "po porodzie"}` },
        ...days.map(([d, l]) => ({ label: dPL(d), value: [l.mood ? `samopoczucie ${l.mood}/5` : "", l.tags.join(", "), l.weight ? `${l.weight} kg` : "", l.note ?? ""].filter(Boolean).join(" · ") })),
        ...epds.filter((e) => e.flagged).map((e) => ({ label: `Ankieta EPDS ${dPL(e.date)}`, value: `${e.score} pkt (${e.level})` })),
      ],
      attachments: [],
      signer: `${data.mother.firstName} ${data.mother.lastName}`,
      place: "",
      date: dPL(today),
    });
    downloadBytes(bytes, `dziennik-ciazy-${today}.pdf`);
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <EventSheet value={editing} onClose={() => setEditing(null)} />
      <div className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight sm:text-[19px]">
              {MONTHS[mo - 1]} {y}
            </h2>
            <div className="flex items-center gap-1">
              <Button size="sm" onClick={() => setEditing(blankEvent(sel, author))} className="mr-1">
                <CalendarPlus className="h-4 w-4" /> <span className="hidden sm:inline">Dodaj wydarzenie</span><span className="sm:hidden">Dodaj</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => (setCursor(today.slice(0, 7)), setSel(today))}>
                Dziś
              </Button>
              <button onClick={() => shift(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Poprzedni miesiąc">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => shift(1)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Następny miesiąc">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1 text-center text-[13px] font-medium text-muted">
            <span className="text-[11px]">tydz.</span>
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={cursor} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }} className="mt-1 grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1">
              {cells.map((d, i) => {
                const rowStart = i % 7 === 0;
                const firstDay = cells.slice(i, i + 7).find(Boolean);
                const wk = rowStart && firstDay && data.child.path === "biologiczny" ? pregnancyWeek(due, firstDay, data.child.birthDate) : null;
                const label = rowStart ? <span key={`w${i}`} className="num grid place-items-center text-[12px] text-muted">{wk && firstDay! <= due ? wk : ""}</span> : null;
                if (!d) return [label, <span key={i} />];
                const ev = events[d] ?? [];
                const isToday = d === today;
                const isSel = d === sel;
                const isDue = d === event;
                const l = dayLogs[d];
                const pregnant = data.child.path === "biologiczny" && d <= due && d >= addDaysISO(due, -280) && !data.child.birthDate;
                return [
                  label,
                  <button
                    key={d}
                    onClick={() => setSel(d)}
                    aria-label={`${dLong(d)}${ev.length ? `, ${ev.map((e) => e.title).join(", ")}` : ""}`}
                    aria-pressed={isSel}
                    className={cn(
                      "relative flex h-11 flex-col items-center justify-center rounded-xl text-[15px] transition sm:h-12",
                      pregnant ? "bg-surface-2/60" : "",
                      isSel ? "bg-fg text-bg" : "hover:bg-surface-3",
                      isDue && !isSel && "bg-gold text-white",
                      isToday && !isSel && !isDue && "ring-2 ring-blue/70 ring-inset",
                    )}
                  >
                    <span className={cn("num font-medium", isToday && !isSel && !isDue && "text-blue")}>{Number(d.slice(8))}</span>
                    {canSeeSymptoms && l?.mood ? <MoodMark mood={l.mood} /> : null}
                    <span className="absolute bottom-1 flex gap-0.5">
                      {ev.some((e) => e.kind === "wizyta") && <span className="h-1 w-1 rounded-full bg-blue" />}
                      {ev.some((e) => e.kind === "zus") && <span className="h-1 w-1 rounded-full bg-orange" />}
                      {ev.some((e) => e.kind === "badanie") && <span className="h-1 w-1 rounded-full bg-green" />}
                    </span>
                    {inWindow(d) && !isSel && <span className="absolute inset-x-2 top-1 h-0.5 rounded-full bg-green/50" />}
                  </button>,
                ];
              })}
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gold" /> termin porodu</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue" /> wizyta</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green" /> okno badań</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-orange" /> termin ZUS/USC</span>
          </div>
        </div>

        {data.child.path === "biologiczny" && (
          <motion.div key={info.stage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">{selWeek ? `${selWeek}. tydzień` : "Połóg"}</Badge>
              <span className="text-[17px] font-semibold">{info.stage}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {[
                ["Jak możesz się czuć", info.feel],
                ["Hormony i ciało", info.body],
                ["Dziecko", info.baby],
              ].map(([t, v]) => (
                <div key={t}>
                  <div className="text-[13px] font-semibold tracking-wide text-muted uppercase">{t}</div>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-fg-2">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 flex gap-2.5 rounded-xl bg-surface-2 px-4 py-3 text-[15px] text-fg-2"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {info.tip}</p>
          </motion.div>
        )}
      </div>

      <aside className="split-scroll min-w-0 space-y-4 xl:self-start">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <div className="text-[13px] text-muted">{sel === today ? "Dziś" : "Wybrany dzień"}</div>
          <div className="text-[18px] font-semibold tracking-tight">{dLong(sel)}</div>
          {selWeek && <div className="text-[14px] text-gold">{selWeek}. tydzień ciąży + {selDayOfWeek} {selDayOfWeek === 1 ? "dzień" : "dni"}</div>}

          {(events[sel] ?? []).length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {events[sel].map((e, i) => (
                <li key={i}>
                  {e.appt ? (
                    <button onClick={() => setEditing(e.appt!)} className="group flex w-full items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left text-[14px] transition hover:bg-brand-soft">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{e.title}</span>
                        <span className="block text-[13px] text-muted">
                          {EVENT_KINDS[e.appt.kind ?? "inne"]}
                          {e.appt.place ? ` · ${e.appt.place}` : ""}
                          {e.appt.shared || e.appt.author === "tata" ? ` · wspólne${e.appt.author === "tata" ? " (dodał partner)" : ""}` : " · tylko ja"}
                        </span>
                      </span>
                      <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-brand" aria-label="Edytuj" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[14px]">
                      <span className={cn("h-2 w-2 shrink-0 rounded-full", e.kind === "termin" ? "bg-gold" : e.kind === "zus" ? "bg-orange" : "bg-green")} />
                      <span className="flex-1">{e.title}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-muted">Brak wydarzeń tego dnia.</p>
          )}

          {(!dad || access.pregnancy) && (
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setEditing(blankEvent(sel, author))}>
              <CalendarPlus className="h-4 w-4" /> Dodaj wydarzenie {sel === today ? "na dziś" : `na ${dLong(sel)}`}
            </Button>
          )}
          {upcoming.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <div className="text-[13px] font-bold text-muted uppercase">Najbliższe wydarzenia</div>
              <ul className="mt-2 space-y-1">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => (setSel(a.date), setCursor(a.date.slice(0, 7)))} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[14px] hover:bg-surface-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="num shrink-0 text-muted">{dPL(a.date).slice(0, 5)}</span>
                      <span className="truncate">{a.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {!dad && data.child.path === "biologiczny" && <MidwifeCard week={pregnancyWeek(due, today, data.child.birthDate)} onPlan={() => setEditing(blankEvent(sel, author, "polozna"))} />}

        {canSeeSymptoms && (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-semibold">Samopoczucie i objawy</h3>
              {dad && <Badge>tylko podgląd</Badge>}
            </div>
            <div className="mt-3 flex justify-between gap-1" role="radiogroup" aria-label="Samopoczucie">
              {MOODS.map((m, i) => {
                const MoodIcon = MOOD_ICONS[i];
                return (
                <motion.button
                  key={m}
                  whileTap={{ scale: 0.88 }}
                  disabled={dad}
                  role="radio"
                  aria-checked={log.mood === i + 1}
                  aria-label={m}
                  title={m}
                  onClick={() => setDayLog(sel, (l) => ({ ...l, mood: l.mood === i + 1 ? undefined : i + 1 }))}
                  className={cn("grid h-12 flex-1 place-items-center rounded-xl transition", log.mood === i + 1 ? "bg-gold-soft ring-1 ring-gold" : "bg-surface-2 opacity-70 hover:opacity-100")}
                >
                  <MoodIcon className={cn("h-6 w-6", log.mood === i + 1 ? "text-gold" : "text-muted")} />
                </motion.button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {SYMPTOM_TAGS.map((t) => {
                const on = log.tags.includes(t);
                return (
                  <button key={t} disabled={dad} aria-pressed={on} onClick={() => setDayLog(sel, (l) => ({ ...l, tags: on ? l.tags.filter((x) => x !== t) : [...l.tags, t] }))} className={cn("rounded-full border px-3 py-1.5 text-[14px] transition", on ? "border-blue bg-blue-soft text-blue" : "border-line text-fg-2 hover:border-line-strong")}>
                    {t}
                  </button>
                );
              })}
            </div>
            {!dad && (
              <textarea value={log.note ?? ""} onChange={(e) => setDayLog(sel, (l) => ({ ...l, note: e.target.value }))} rows={2} placeholder="Notatka (np. ciśnienie, waga, pytania do lekarza)" className="mt-3 w-full rounded-xl border border-line bg-surface-2 px-3 py-2 text-[15px] outline-none focus:border-line-strong" />
            )}
            {!dad && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={exportReport}>
                <Download className="h-3.5 w-3.5" /> Raport dla lekarza (PDF)
              </Button>
            )}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-xl border border-line px-4 py-3 text-[13px] text-muted">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" /> Treści edukacyjne mają charakter ogólny i nie zastępują porady lekarza ani położnej.
        </div>
      </aside>
    </div>
  );
}
