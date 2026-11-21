"use client";
import { BookOpen, HeartHandshake } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, LegalChip } from "@/components/ui/badge";
import { PageHeader, Skeleton, Stat } from "@/components/ui/misc";
import { Segmented, Slider, Switch } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { ARTICLES } from "@/data/organize";
import { CaseRow, useCases } from "@/components/cases/case-ui";
import { cn, dShort, zl, zl0 } from "@/lib/utils";

/** Panel Taty / Partnera – widoczne sekcje zależą od uprawnień nadanych przez Mamę. */
export function PartnerZone() {
  const { data, setData, access, openCase } = useApp();
  const { items } = useCases();
  const { result } = useCalculation();
  const [article, setArticle] = useState<string | null>(null);
  if (!result) return <Skeleton className="h-96" />;
  const fSeg = result.segments.filter((s) => s.who === "ojciec");
  const fBase = result.father?.base;
  const nt = result.leave.nonTransferableWeeks;
  const pat = result.deadlines.find((d) => d.id === "paternity");
  const a = ARTICLES.find((x) => x.id === article);

  return (
    <div className="space-y-6">
      <PageHeader title="Moje sprawy i urlop" description="Formalności, które możesz przejąć, gdy mama jest w połogu, i Twoje uprawnienia urlopowe." />
      <div className="grid gap-4 xl:grid-cols-12">
        {access.formalities && (
          <section className="xl:col-span-7" aria-labelledby="dad-cases">
            <h2 id="dad-cases" className="text-[21px] font-bold">Formalności po porodzie</h2>
            <p className="mt-1 text-[15px] text-fg-2">Status każdej sprawy pobieramy z ZUS i USC. Kliknij, aby zobaczyć instrukcję.</p>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {items.map((i) => (
                <li key={i.guide.id} className="p-1">
                  <CaseRow item={i} onOpen={() => openCase(i.guide.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}
        {access.leave && (
          <Card id="urlop" className={access.formalities ? "xl:col-span-5" : "xl:col-span-12"}>
            <CardHeader title="Mój urlop" subtitle={fBase ? `Podstawa: ${zl(fBase.base)} · ${result.father?.eligibility.payer.payerLabel}` : ""} icon={<HeartHandshake className="h-4 w-4" />} />
            <CardBody className="space-y-5">
              <div className="rounded-xl bg-surface-2 px-4 py-3">
                <Switch checked={data.plan.paternity.enabled} onCheckedChange={(v) => setData((d) => ((d.plan.paternity.enabled = v), d))} label="Urlop ojcowski – 2 tygodnie (100%)" description={pat ? `Do wykorzystania do ${dShort(pat.date)}` : "Do 12. miesiąca życia dziecka"} />
                {data.plan.paternity.enabled && <Segmented className="mt-3 flex w-full" value={data.plan.paternity.split} onChange={(v) => setData((d) => ((d.plan.paternity.split = v), d))} options={[{ value: "jednorazowo", label: "14 dni naraz" }, { value: "2x7", label: "2 × 7 dni" }]} />}
              </div>
              <div>
                <div className="mb-2 flex justify-between text-[15px]">
                  <span>
                    Rodzicielski: <b className="num">{data.plan.fatherParentalWeeks} tyg.</b>
                  </span>
                  {data.plan.fatherParentalWeeks < nt ? <Badge tone="gold">{nt - data.plan.fatherParentalWeeks} tyg. przepadnie</Badge> : <Badge tone="green">9 tyg. wykorzystane</Badge>}
                </div>
                <Slider tone="green" value={data.plan.fatherParentalWeeks} min={0} max={Math.max(nt, result.leave.parentalWeeks - data.plan.motherParentalWeeks)} onChange={(v) => setData((d) => ((d.plan.fatherParentalWeeks = v), d))} />
                <p className="mt-2 text-[13px] text-muted">{nt} tygodni rodzicielskiego przysługuje wyłącznie Tobie – nie można ich przenieść na mamę.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Moje zasiłki łącznie" value={zl0(result.totals.father)} tone="green" />
                <Stat label="Miesięcznie (9 tyg.)" value={zl0(fSeg.find((s) => s.kind === "rodzicielski_niezbywalny")?.monthlyAmount ?? 0)} sub="70% podstawy" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <LegalChip>art. 182³ KP</LegalChip>
                <LegalChip>art. 182¹a § 4 KP</LegalChip>
                <LegalChip>art. 31 ust. 3f</LegalChip>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader title="Dla ojców – wiedza i wsparcie" subtitle="Połóg partnerki, formalności, pielęgnacja noworodka" icon={<BookOpen className="h-4 w-4" />} />
        <CardBody className="grid gap-3 md:grid-cols-3">
          {ARTICLES.filter((x) => x.category === "dla ojców" || x.category === "formalności").map((x) => (
            <button key={x.id} onClick={() => setArticle(x.id)} className="rounded-xl border border-line bg-surface-2/40 p-4 text-left transition hover:border-line-strong">
              <Badge tone="blue">{x.category}</Badge>
              <div className="mt-2 text-[16px] font-semibold leading-snug">{x.title}</div>
              <div className="mt-1 text-[13px] text-muted">{x.readMin} min czytania</div>
            </button>
          ))}
        </CardBody>
      </Card>
      <Sheet open={!!a} onOpenChange={(v) => !v && setArticle(null)} title={a?.title ?? ""} description={a?.lead}>
        <div className="space-y-3 text-[16px] leading-relaxed text-fg-2">{a?.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      </Sheet>
    </div>
  );
}
