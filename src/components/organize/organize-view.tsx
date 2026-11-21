"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Clock, LocateFixed } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ring, Skeleton } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { ARTICLES, BOOKS, CHECKLISTS, PLACES, PLACE_LABELS, type Article, type PlaceType } from "@/data/organize";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const PlacesMap = dynamic(() => import("./places-map"), { ssr: false, loading: () => <Skeleton className="h-[360px] sm:h-[440px]" /> });
const DOT: Record<PlaceType, string> = { zus: "bg-blue", usc: "bg-gold", poz: "bg-green", szpital: "bg-red" };

export function MapTab() {
  const [types, setTypes] = useState<PlaceType[]>(["zus", "usc", "poz", "szpital"]);
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<[number, number] | null>(null);
  const shown = PLACES.filter((p) => types.includes(p.type));
  const sorted = useMemo(() => {
    if (!user) return shown;
    const dist = (p: (typeof PLACES)[number]) => Math.hypot(p.lat - user[0], (p.lng - user[1]) * Math.cos((user[0] * Math.PI) / 180)) * 111;
    return [...shown].sort((a, b) => dist(a) - dist(b)).map((p) => ({ ...p, km: dist(p) }));
  }, [shown, user]);

  function locate() {
    if (!navigator.geolocation) return toast.error("Geolokalizacja niedostępna");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUser(c);
        setFocus(c);
      },
      () => {
        const c: [number, number] = [52.2297, 21.0122];
        setUser(c);
        setFocus(c);
        toast.info("Brak zgody na lokalizację – pokazuję centrum Warszawy");
      },
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line p-3">
          {(Object.keys(PLACE_LABELS) as PlaceType[]).map((t) => (
            <button key={t} onClick={() => setTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] transition", types.includes(t) ? "border-line-strong bg-surface-2" : "border-line text-muted")}>
              <span className={cn("h-2.5 w-2.5 rounded-full", DOT[t])} /> {PLACE_LABELS[t]}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto" onClick={locate}>
            <LocateFixed className="h-3.5 w-3.5" /> Najbliższe
          </Button>
        </div>
        <div className="p-2">
          <PlacesMap places={shown} focus={focus} user={user} />
        </div>
      </Card>
      <div className="space-y-3">
        <div className="rounded-xl bg-green-soft px-4 py-3 text-[14px] text-green">
          <b>Wizyty patronażowe:</b> po porodzie przysługuje Ci 4–6 bezpłatnych wizyt położnej środowiskowej z POZ. Wybierz położną (deklaracja) jeszcze w ciąży.
        </div>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {sorted.map((p) => (
            <button key={p.id} onClick={() => setFocus([p.lat, p.lng])} className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition hover:border-line-strong">
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT[p.type])} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{p.name}</span>
                <span className="block text-[13px] text-muted">{p.address}</span>
                {p.note && <span className="block text-[13px] text-fg-2">{p.note}</span>}
              </span>
              {"km" in p && <span className="num text-[13px] text-muted">{(p as { km: number }).km.toFixed(1)} km</span>}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-muted">Dane demonstracyjne (Warszawa). W produkcji: rejestry placówek ZUS, USC i NFZ.</p>
      </div>
    </div>
  );
}

export function ChecklistTab({ readOnly }: { readOnly?: boolean } = {}) {
  const mounted = useMounted();
  const { checklists, toggleCheck } = useApp();
  if (!mounted) return <Skeleton className="h-80" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Object.entries(CHECKLISTS).map(([key, list]) => {
        const done = list.items.filter((_, i) => checklists[`${key}-${i}`]).length;
        return (
          <Card key={key}>
            <CardHeader title={list.title} subtitle={`${done} z ${list.items.length}`} action={<div className="relative"><Ring value={done / list.items.length} size={40} stroke={4} /><span className="num absolute inset-0 grid place-items-center text-[12px] font-semibold">{Math.round((done / list.items.length) * 100)}%</span></div>} />
            <CardBody className="space-y-1">
              {list.items.map((it, i) => {
                const id = `${key}-${i}`;
                const ok = !!checklists[id];
                return (
                  <button key={id} disabled={readOnly} onClick={() => toggleCheck(id)} className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-2">
                    <motion.span animate={{ scale: ok ? [1, 1.2, 1] : 1 }} className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border", ok ? "border-brand bg-brand text-white" : "border-line-strong")}>{ok && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</motion.span>
                    <span className={cn("text-[15px]", ok && "text-muted line-through")}>{it}</span>
                  </button>
                );
              })}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

const CATEGORY_ORDER: Article["category"][] = ["połóg", "laktacja", "formalności", "powrót do pracy", "dla ojców"];
const CATEGORY_TITLE: Record<Article["category"], string> = { połóg: "Połóg", laktacja: "Karmienie", formalności: "Formalności po porodzie", "powrót do pracy": "Powrót do pracy", "dla ojców": "Dla taty" };

/** Baza wiedzy: poradniki pogrupowane tematycznie (połóg na początku) i polecane książki. */
export function KnowledgeTab() {
  const [article, setArticle] = useState<string | null>(null);
  const a = ARTICLES.find((x) => x.id === article);
  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-8">
        {CATEGORY_ORDER.map((cat) => {
          const list = ARTICLES.filter((x) => x.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat}>
              <h2 className="text-[19px] font-bold">{CATEGORY_TITLE[cat]}</h2>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {list.map((x) => (
                  <li key={x.id}>
                    <button onClick={() => setArticle(x.id)} className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2">
                      <BookOpen className="mt-1 h-5 w-5 shrink-0 text-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] leading-snug font-bold">{x.title}</span>
                        <span className="mt-1 block text-[15px] text-fg-2">{x.lead}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[13px] text-muted">
                        <Clock className="h-3.5 w-3.5" /> {x.readMin} min
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <aside>
        <h2 className="text-[19px] font-bold">Książki, które oswajają lęki</h2>
        <ul className="mt-3 space-y-4">
          {BOOKS.map((b) => (
            <li key={b.title}>
              <div className="text-[16px] leading-snug font-bold">{b.title}</div>
              <div className="text-[14px] text-muted">{b.author}</div>
              <p className="mt-1 text-[15px] text-fg-2">{b.why}</p>
            </li>
          ))}
        </ul>
      </aside>
      <Sheet open={!!a} onOpenChange={(v) => !v && setArticle(null)} title={a?.title ?? ""} description={a?.lead}>
        <div className="max-w-[65ch] space-y-4 text-[16px] leading-relaxed text-fg-2">{a?.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        <p className="mt-6 text-[14px] text-muted">Treści edukacyjne nie zastępują porady lekarza ani położnej.</p>
      </Sheet>
    </div>
  );
}
