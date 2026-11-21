"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertOctagon, Building2, CheckCircle2, FileHeart, Loader2, Mail, Receipt, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, LegalChip } from "@/components/ui/badge";
import { useApp } from "@/store/app";
import { ZusInbox } from "@/components/messages/zus-inbox";
import { cn, dShort, zl } from "@/lib/utils";
import { daysBetween } from "@/lib/utils";

interface ZusData {
  person: { firstName: string; lastName: string; pesel: string };
  insurance: { titleLabel: string; sicknessInsured: boolean; statusLabel: string; since: string; voluntary: boolean; payer: { name: string; nip: string; insuredCount: number } | null; contributions12m: { month: string; base: number }[] };
  debtCertificate: null | { number: string; asOf: string; debt: number; threshold: number; blocked: boolean; text: string };
  ezla: { series: string; from: string; to: string; codeB: boolean; issuer: string; diagnosisCode: string; status: string }[];
  messages: { from: string; date: string; text: string }[];
}

const STEPS = [
  { id: "ins", label: "Dane o ubezpieczeniu (PUE/eZUS)", icon: ShieldCheck },
  { id: "con", label: "Historia składek – 12 miesięcy", icon: Receipt },
  { id: "debt", label: "Zaświadczenie o stanie zadłużenia", icon: Building2 },
  { id: "zla", label: "Zaświadczenia lekarskie e-ZLA", icon: FileHeart },
];

export function ZusFetch() {
  const { profileId, setZusFetched, zusFetched, loginMethod } = useApp();
  const [data, setData] = useState<ZusData | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (!profileId) return;
    let alive = true;
    const timers = STEPS.map((_, i) => setTimeout(() => alive && setDone((d) => Math.max(d, i + 1)), 450 + i * 420));
    fetch(`/api/integrations/zus?profile=${profileId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setData(j);
        setZusFetched(true);
      });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [profileId, setZusFetched]);

  if (loginMethod === "manual" || !profileId) {
    return (
      <Card>
        <CardHeader title="Tryb ręczny" subtitle="Nie pobieramy danych z ZUS – uzupełnij swoją sytuację w formularzu poniżej. Możesz też zalogować się profilem testowym." icon={<ShieldCheck className="h-4 w-4" />} />
        <CardBody>
          <p className="text-[15px] text-muted">Wszystkie obliczenia wykonuje ten sam deterministyczny silnik – bez względu na źródło danych.</p>
        </CardBody>
      </Card>
    );
  }

  const ready = data && done >= STEPS.length;
  const debt = data?.debtCertificate;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Pobieranie danych z systemów ZUS" subtitle="Symulacja połączenia z PUE/eZUS – w produkcji: API ZUS po autoryzacji mObywatel." icon={<Loader2 className={cn("h-4 w-4", !ready && "animate-spin")} />} action={ready ? <Badge tone="green" dot>Zsynchronizowano</Badge> : <Badge tone="blue" dot>Łączenie…</Badge>} />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.map((s, i) => {
              const ok = done > i;
              const Icon = s.icon;
              return (
                <div key={s.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors", ok ? "border-line bg-surface-2" : "border-dashed border-line")}>
                  <Icon className={cn("h-4 w-4", ok ? "text-fg-2" : "text-muted")} />
                  <span className={cn("flex-1 text-[15px]", ok ? "text-fg" : "text-muted")}>{s.label}</span>
                  <AnimatePresence mode="wait">
                    {ok ? (
                      <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                        <CheckCircle2 className="h-4 w-4 text-green" />
                      </motion.span>
                    ) : (
                      <Loader2 key="ld" className="h-4 w-4 animate-spin text-muted" />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <AnimatePresence>
        {ready && data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }} className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Ubezpieczenie chorobowe" subtitle={`${data.person.firstName} ${data.person.lastName} · PESEL ${data.person.pesel}`} icon={data.insurance.sicknessInsured ? <ShieldCheck className="h-4 w-4 text-green" /> : <ShieldX className="h-4 w-4 text-red" />} />
              <CardBody className="space-y-3">
                <div className={cn("rounded-xl px-4 py-3", data.insurance.sicknessInsured ? "bg-green-soft" : "bg-red-soft")}>
                  <div className={cn("text-[17px] font-semibold", data.insurance.sicknessInsured ? "text-green" : "text-red")}>{data.insurance.statusLabel}</div>
                  <div className="mt-0.5 text-[14px] text-fg-2">
                    {data.insurance.titleLabel} · od {dShort(data.insurance.since)}
                  </div>
                </div>
                {data.insurance.payer && (
                  <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-[15px]">
                    <div>
                      <div className="font-medium">{data.insurance.payer.name}</div>
                      <div className="text-muted">NIP {data.insurance.payer.nip}</div>
                    </div>
                    <Badge tone={data.insurance.payer.insuredCount > 20 ? "green" : "blue"}>{data.insurance.payer.insuredCount} ubezp.</Badge>
                  </div>
                )}
                <div>
                  <div className="mb-2 text-[13px] font-medium text-muted">Podstawa składek – ostatnie 12 mies.</div>
                  <div className="flex h-16 items-end gap-1">
                    {data.insurance.contributions12m.map((m) => {
                      const max = Math.max(...data.insurance.contributions12m.map((x) => x.base));
                      return <div key={m.month} title={`${m.month}: ${zl(m.base)}`} className="flex-1 rounded-t-md bg-brand/70" style={{ height: `${Math.max(8, (m.base / max) * 100)}%` }} />;
                    })}
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="space-y-4">
              {debt && (
                <Card id="zadluzenie" className={cn(debt.blocked && "border-[color-mix(in_oklab,var(--red)_40%,transparent)]")}>
                  <CardHeader title="Zaświadczenie o stanie zadłużenia" subtitle={`${debt.number} · na dzień ${dShort(debt.asOf)}`} icon={debt.blocked ? <AlertOctagon className="h-4 w-4 text-red" /> : <ShieldCheck className="h-4 w-4 text-green" />} />
                  <CardBody className="space-y-3">
                    <p className="text-[15px]">{debt.text}</p>
                    <div className="grid grid-cols-2 gap-2 text-[15px]">
                      <div className="rounded-xl bg-surface-2 px-3 py-2">
                        <div className="text-muted">Zadłużenie</div>
                        <div className={cn("num text-lg font-semibold", debt.blocked ? "text-red" : "text-green")}>{zl(debt.debt)}</div>
                      </div>
                      <div className="rounded-xl bg-surface-2 px-3 py-2">
                        <div className="text-muted">Próg (1% płacy min.)</div>
                        <div className="num text-lg font-semibold">{zl(debt.threshold)}</div>
                      </div>
                    </div>
                    {debt.blocked && (
                      <div className="rounded-xl bg-red-soft px-4 py-3 text-[15px] text-red">
                        <b>Blokada wypłaty zasiłków.</b> Spłać całość zadłużenia – w przeciwnym razie prawo do zasiłku przedawni się po 6 miesiącach od dnia jego powstania. <LegalChip className="ml-1">art. 2a ustawy zasiłkowej</LegalChip>
                      </div>
                    )}
                  </CardBody>
                </Card>
              )}
              <Card>
                <CardHeader title="Zaświadczenia lekarskie e-ZLA" subtitle={data.ezla.length ? `${data.ezla.length} zaświadczeń w PUE` : "Brak zaświadczeń"} icon={<FileHeart className="h-4 w-4" />} />
                <CardBody className="space-y-2">
                  {data.ezla.map((z) => (
                    <div key={z.series} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-[15px]">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">
                          {z.series} <span className="text-muted">· {daysBetween(z.from, z.to) + 1} dni</span>
                        </div>
                        <div className="text-[13px] text-muted">
                          {dShort(z.from)} – {dShort(z.to)} · {z.issuer} · {z.diagnosisCode}
                        </div>
                      </div>
                      {z.codeB ? <Badge tone="green">Kod B · 100%</Badge> : <Badge>bez kodu</Badge>}
                    </div>
                  ))}
                  {!data.ezla.length && <p className="text-[15px] text-muted">Brak zwolnień lekarskich w okresie ciąży.</p>}
                </CardBody>
              </Card>
            </div>

            <Card className="lg:col-span-2">
              <CardHeader title="Wiadomości PUE/eZUS" subtitle="Zapytaj ZUS – odpowiedź pojawi się poniżej i pod dzwonkiem." icon={<Mail className="h-4 w-4" />} />
              <CardBody>
                <ZusInbox seed={data.messages} />
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {zusFetched && null}
    </div>
  );
}
