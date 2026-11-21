"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Flower2, HeartCrack, Hospital, Pencil, Phone, PhoneCall, ShieldAlert, Siren, Stethoscope, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Field, Input, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { CATEGORY_LABELS, CHARITIES, EPDS, HOTLINES, OFFICIAL_LINKS, scoreEpds, type CharityCategory } from "@/data/support";
import { useMounted } from "@/hooks/use-mounted";
import { cn, todayISO, zl } from "@/lib/utils";

export function SupportView() {
  const mounted = useMounted();
  const { contacts, setContacts, account, setData } = useApp();
  const { result } = useCalculation();
  const [cat, setCat] = useState<CharityCategory | "all">("all");
  const [editContacts, setEditContacts] = useState(false);
  const [c, setC] = useState(contacts);
  const router = useRouter();

  const daily = result?.mother.base.dailyBase ?? 0;
  const funeral = 7000;
  const sos = [
    { label: "Partner", sub: mounted ? contacts.partner : "", href: `tel:${contacts.partner.replace(/\s/g, "")}`, icon: UserRound, cls: "bg-blue-soft text-blue" },
    { label: "Lekarz prowadzący", sub: mounted ? contacts.doctor : "", href: `tel:${contacts.doctor.replace(/\s/g, "")}`, icon: Stethoscope, cls: "bg-green-soft text-green" },
    { label: "112", sub: "Numer alarmowy", href: "tel:112", icon: Siren, cls: "bg-red text-white" },
    { label: "Telefon Zaufania", sub: "22 484 88 01 · antydepresyjny", href: "tel:224848801", icon: PhoneCall, cls: "bg-gold-soft text-gold" },
  ];

  const paths = [
    {
      id: "martwe",
      icon: Flower2,
      title: "Urodzenie martwego dziecka",
      lines: [
        `Zasiłek macierzyński 100% przez 8 tygodni po porodzie – bez względu na tydzień ciąży${daily ? ` (≈ ${zl(daily * 56)})` : ""}.`,
        `Zasiłek pogrzebowy ${zl(funeral)} – wniosek Z-12 do 12 miesięcy; potrzebny akt zgonu wydany na podstawie karty martwego urodzenia.`,
        "Dokument do zasiłku: zaświadczenie lekarza (specjalisty położnictwa i ginekologii) lub położnej o martwym urodzeniu (§ 13 ust. 1 pkt 2 rozporządzenia).",
        "Możesz nadać dziecku imię i zarejestrować urodzenie w USC; masz prawo do pochówku.",
      ],
      legal: ["art. 180¹ KP", "art. 29a ustawy zasiłkowej", "art. 77–80 ustawy emerytalnej"],
      apply: () => setData((d) => ((d.child.stillbirth = true), d)),
    },
    {
      id: "zgon",
      icon: HeartCrack,
      title: "Zgon dziecka",
      lines: ["Zgon przed ukończeniem 8 tygodni życia: zasiłek przez 8 tygodni po porodzie, ale nie krócej niż 7 dni od dnia zgonu.", "Zgon po 8 tygodniach życia: zasiłek zachowany przez 7 dni od dnia zgonu.", "Przy porodzie mnogim – urlop w wymiarze stosownym do liczby dzieci pozostałych przy życiu.", `Zasiłek pogrzebowy ${zl(funeral)} (Z-12).`],
      legal: ["art. 180¹ § 1–2 KP", "art. 29a ustawy zasiłkowej"],
    },
    {
      id: "hospitalizacja",
      icon: Hospital,
      title: "Hospitalizacja matki",
      lines: ["Po wykorzystaniu co najmniej 8 tygodni urlopu macierzyńskiego po porodzie mama może go przerwać na czas pobytu w szpitalu – ojciec (lub inny członek najbliższej rodziny) przejmuje część urlopu.", "Ojciec składa wniosek z oświadczeniem mamy o przerwaniu urlopu i zaświadczeniem szpitala o przyjęciu (§ 6 rozporządzenia z 11.03.2025).", "Zasiłek ojca – 100% jego podstawy."],
      legal: ["art. 180 § 16 KP", "§ 6–7 rozporządzenia z 11.03.2025"],
    },
    {
      id: "smierc-matki",
      icon: ShieldAlert,
      title: "Śmierć matki lub porzucenie dziecka",
      lines: ["Ojciec (albo inny członek najbliższej rodziny) ma prawo do pozostałej części urlopu macierzyńskiego od dnia po zgonie matki.", "Wniosek zawiera oświadczenie o dacie zgonu i okres urlopu; załącznik: odpis skrócony aktu urodzenia dziecka (§ 8 rozporządzenia).", "Te same zasady stosuje się, gdy matka nie była ubezpieczona (§ 10)."],
      legal: ["art. 180 § 15–16 KP", "§ 8–11 rozporządzenia z 11.03.2025"],
    },
  ];

  const filtered = CHARITIES.filter((x) => cat === "all" || x.categories.includes(cat));

  return (
    <div className="space-y-6">
      <PageHeader title="Nie jesteś w tym sama" description="Szybki kontakt w nagłych sytuacjach, ścieżki prawne w trudnych chwilach, organizacje charytatywne i dyskretna ankieta samopoczucia po porodzie." />

      <Card>
        <CardHeader title="Panel SOS" subtitle="Jedno dotknięcie – połączenie" icon={<Phone className="h-4 w-4" />} action={<Button size="sm" variant="ghost" onClick={() => (setC(contacts), setEditContacts(true))}><Pencil className="h-3.5 w-3.5" /> Kontakty</Button>} />
        <CardBody className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {sos.map((s) => (
            <motion.a key={s.label} href={s.href} whileTap={{ scale: 0.96 }} className={cn("flex min-h-[112px] flex-col justify-between rounded-2xl p-4 transition hover:opacity-90", s.cls)}>
              <s.icon className="h-7 w-7" />
              <div>
                <div className="text-[19px] font-semibold">{s.label}</div>
                <div className="text-[13px] opacity-80">{s.sub}</div>
              </div>
            </motion.a>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card>
            <CardHeader title="Sytuacje trudne – ścieżka prawna" subtitle="Co Ci przysługuje i jakie dokumenty są potrzebne" icon={<Flower2 className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              {paths.map((p) => (
                <details key={p.id} className="group rounded-xl border border-line bg-surface-2/40 open:bg-surface-2/70">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5">
                    <p.icon className="h-5 w-5 text-muted" />
                    <span className="flex-1 text-[16px] font-semibold">{p.title}</span>
                    <ArrowRight className="h-4 w-4 text-muted transition group-open:rotate-90" />
                  </summary>
                  <div className="space-y-2 px-4 pb-4 pl-12 text-[15px] leading-relaxed text-fg-2">
                    {p.lines.map((l) => (
                      <p key={l}>• {l}</p>
                    ))}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {p.legal.map((l) => (
                        <LegalChip key={l}>{l}</LegalChip>
                      ))}
                      {p.apply && account === "mama" && (
                        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => (p.apply!(), router.push("/kalkulator?tab=urlopy"))}>
                          Przelicz moją sytuację <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </details>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organizacje charytatywne" subtitle="Wyłącznie podmioty o charakterze charytatywnym – fundacje i stowarzyszenia" icon={<HeartCrack className="h-4 w-4" />} />
            <CardBody className="space-y-3">
              <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {(["all", ...Object.keys(CATEGORY_LABELS)] as (CharityCategory | "all")[]).map((k) => (
                  <button key={k} onClick={() => setCat(k)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[14px] transition", cat === k ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-line-strong")}>
                    {k === "all" ? "Wszystkie" : CATEGORY_LABELS[k]}
                  </button>
                ))}
              </div>
              <motion.div layout className="grid gap-2 sm:grid-cols-2">
                <AnimatePresence mode="popLayout">
                  {filtered.map((x) => (
                    <motion.a layout key={x.name} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} href={x.url} target="_blank" rel="noreferrer" className="group rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[15px] font-semibold">{x.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted" />
                      </div>
                      <p className="mt-1 text-[14px] leading-snug text-muted">{x.description}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {x.categories.map((k) => (
                          <Badge key={k}>{CATEGORY_LABELS[k]}</Badge>
                        ))}
                        {x.phone && <Badge tone="blue"><Phone className="h-3 w-3" /> {x.phone}</Badge>}
                      </div>
                    </motion.a>
                  ))}
                </AnimatePresence>
              </motion.div>
              <p className="text-[13px] text-muted">Katalog demonstracyjny – przed wdrożeniem weryfikowany przez ZUS (KRS, status OPP).</p>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <EpdsCard />
          <Card>
            <CardHeader title="Telefony wsparcia" />
            <CardBody className="space-y-2">
              {HOTLINES.map((h) => (
                <a key={h.number} href={`tel:${h.number.replace(/\s/g, "")}`} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 hover:border-line-strong">
                  <div>
                    <div className="text-[15px] font-medium">{h.name}</div>
                    <div className="text-[13px] text-muted">{h.note}</div>
                  </div>
                  <span className="num text-[17px] font-semibold">{h.number}</span>
                </a>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Oficjalne źródła" />
            <CardBody className="space-y-2">
              {OFFICIAL_LINKS.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-[15px] hover:border-line-strong">
                  <span>
                    <Badge tone="blue" className="mr-2">{l.org}</Badge>
                    {l.label}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-muted" />
                </a>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      <Sheet open={editContacts} onOpenChange={setEditContacts} title="Kontakty SOS">
        <div className="space-y-4">
          <Field label="Partner">
            <Input value={c.partner} onChange={(e) => setC({ ...c, partner: e.target.value })} />
          </Field>
          <Field label="Lekarz prowadzący">
            <Input value={c.doctor} onChange={(e) => setC({ ...c, doctor: e.target.value })} />
          </Field>
          <Button className="w-full" onClick={() => (setContacts(c), setEditContacts(false), toast.success("Zapisano kontakty"))}>Zapisz</Button>
        </div>
      </Sheet>
    </div>
  );
}

function EpdsCard() {
  const { addEpds, epds } = useApp();
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<number[]>([]);
  const [flag, setFlag] = useState(true);
  const res = answers.length === EPDS.length ? scoreEpds(answers) : null;
  const q = EPDS[step];

  function answer(i: number) {
    const next = [...answers.slice(0, step), i];
    setAnswers(next);
    if (step < EPDS.length - 1) setStep(step + 1);
    else setStep(EPDS.length);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Jak się czujesz?" subtitle="Ankieta oparta na Edynburskiej Skali Depresji Poporodowej (EPDS) – ostatnie 7 dni" icon={<HeartCrack className="h-4 w-4" />} />
      <CardBody>
        <AnimatePresence mode="wait">
          {step === -1 ? (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <p className="text-[15px] leading-relaxed text-fg-2">10 krótkich pytań. Wynik widzisz tylko Ty – możesz oznaczyć go w raporcie dla lekarza. To nie jest diagnoza, a sygnał, czy warto porozmawiać ze specjalistą.</p>
              {epds[0] && <p className="text-[13px] text-muted">Ostatni wynik: {epds[0].score} pkt ({epds[0].date})</p>}
              <Button onClick={() => (setStep(0), setAnswers([]))} className="w-full">
                Rozpocznij ankietę
              </Button>
            </motion.div>
          ) : step < EPDS.length ? (
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ type: "spring", stiffness: 360, damping: 32 }} className="space-y-3">
              <div className="flex items-center justify-between text-[13px] text-muted">
                <span>Pytanie {step + 1} z {EPDS.length}</span>
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-3">
                  <motion.div className="h-full bg-blue" animate={{ width: `${((step + 1) / EPDS.length) * 100}%` }} />
                </div>
              </div>
              <div className="text-[17px] font-semibold leading-snug">{q.q}</div>
              <div className="space-y-1.5">
                {q.options.map((o, i) => (
                  <button key={o} onClick={() => answer(i)} className={cn("w-full rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition", answers[step] === i ? "border-blue bg-blue-soft" : "border-line hover:border-line-strong hover:bg-surface-2")}>
                    {o}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
                  <ArrowLeft className="h-3.5 w-3.5" /> Wstecz
                </button>
              )}
            </motion.div>
          ) : (
            res && (
              <motion.div key="res" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className={cn("rounded-xl p-4", res.selfHarm ? "bg-red-soft" : res.level === "wysoki" ? "bg-orange-soft" : res.level === "podwyższony" ? "bg-gold-soft" : "bg-green-soft")}>
                  <div className="num text-[30px] font-semibold">{res.score} <span className="text-[16px] font-medium text-muted">/ 30 pkt</span></div>
                  <div className="text-[15px] font-medium">
                    {res.selfHarm
                      ? "Twoje odpowiedzi wskazują na myśli o zrobieniu sobie krzywdy. Proszę, porozmawiaj z kimś teraz."
                      : res.level === "wysoki"
                        ? "Wynik wskazuje na wysokie ryzyko depresji poporodowej. Skontaktuj się z lekarzem lub psychologiem."
                        : res.level === "podwyższony"
                          ? "Wynik jest podwyższony – warto porozmawiać z położną lub lekarzem."
                          : "Wynik w normie. Dbaj o siebie i odpoczynek."}
                  </div>
                </div>
                {(res.selfHarm || res.level !== "niski") && (
                  <div className="grid grid-cols-2 gap-2">
                    <a href="tel:8007022222" className="rounded-xl bg-red px-3 py-2.5 text-center text-[15px] font-semibold text-white">800 70 2222</a>
                    <a href="tel:224848801" className="rounded-xl bg-surface-2 px-3 py-2.5 text-center text-[15px] font-semibold">22 484 88 01</a>
                  </div>
                )}
                <Switch checked={flag} onCheckedChange={setFlag} label="Oznacz w raporcie dla lekarza" description="Wynik pojawi się w eksporcie z trackera ciąży" />
                <Button className="w-full" variant="secondary" onClick={() => (addEpds({ date: todayISO(), score: res.score, level: res.level, flagged: flag }), setStep(-1), toast.success("Zapisano wynik ankiety"))}>
                  Zapisz i zakończ
                </Button>
              </motion.div>
            )
          )}
        </AnimatePresence>
        <p className="mt-3 text-[12px] text-muted">Na podstawie: Cox, Holden, Sagovsky (1987), Edinburgh Postnatal Depression Scale.</p>
      </CardBody>
    </Card>
  );
}
