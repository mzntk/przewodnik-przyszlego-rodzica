"use client";
import { motion } from "framer-motion";
import { BookOpen, Check, Clock, LocateFixed, MapPinOff, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ring, Skeleton } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { ARTICLES, BOOKS, CHECKLISTS, CITIES, CITY_CENTER, PLACES, PLACE_HINT, PLACE_LABELS, type Article, type Place, type PlaceType } from "@/data/organize";
import { norm } from "@/components/layout/search-dialog";
import { cn, plural } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const PlacesMap = dynamic(() => import("./places-map"), { ssr: false, loading: () => <Skeleton className="h-[340px] sm:h-[460px]" /> });
const DOT: Record<PlaceType, string> = { zus: "bg-brand", usc: "bg-gold", poz: "bg-blue", szpital: "bg-red" };

/** Gdy mapa (biblioteka Leaflet) zgłosi błąd, pokazujemy samą listę zamiast „wywalenia” całej aplikacji. */
class MapBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="grid h-[340px] place-items-center rounded-xl bg-surface-2 p-6 text-center text-[15px] text-fg-2 sm:h-[460px]">
          <div>
            <MapPinOff className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-2">Nie udało się wczytać mapy. Lista placówek obok działa normalnie.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => this.setState({ failed: false })}>
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

const km = (a: [number, number], p: Place) => Math.hypot(p.lat - a[0], (p.lng - a[1]) * Math.cos((a[0] * Math.PI) / 180)) * 111;

export function MapTab() {
  const [types, setTypes] = useState<PlaceType[]>(["zus", "usc", "poz", "szpital"]);
  const [city, setCity] = useState<string>("Warszawa");
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [user, setUser] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const needle = norm(q.trim());
  const shown = PLACES.filter((p) => types.includes(p.type) && (needle ? norm(`${p.name} ${p.address} ${p.city} ${p.note ?? ""}`).includes(needle) : user || p.city === city));
  const sorted = user ? [...shown].sort((a, b) => km(user, a) - km(user, b)) : shown;

  function locate() {
    const done = (c: [number, number]) => {
      setUser(c);
      setFocus(c);
      const nearest = [...PLACES].sort((a, b) => km(c, a) - km(c, b))[0];
      if (nearest) setCity(nearest.city);
    };
    if (!navigator.geolocation) return toast.error("Geolokalizacja niedostępna w tej przeglądarce");
    navigator.geolocation.getCurrentPosition(
      (pos) => done([pos.coords.latitude, pos.coords.longitude]),
      () => {
        done(CITY_CENTER.Warszawa);
        toast.info("Brak zgody na lokalizację – pokazuję centrum Warszawy");
      },
      { timeout: 8000 },
    );
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="min-w-0 overflow-hidden">
        <div className="space-y-2 border-b border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: nazwa, ulica, miasto…" className="h-10 w-full rounded-xl border border-line bg-surface-2 pr-3 pl-9 text-[15px] outline-none focus:border-brand" />
            </div>
            <select value={city} onChange={(e) => (setCity(e.target.value), setUser(null), setQ(""), setFocus(CITY_CENTER[e.target.value]))} className="h-10 rounded-xl border border-line bg-surface-2 px-3 text-[15px]" aria-label="Miasto">
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <Button size="sm" variant="secondary" className="h-10" onClick={locate}>
              <LocateFixed className="h-4 w-4" /> Najbliżej mnie
            </Button>
          </div>
          <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {(Object.keys(PLACE_LABELS) as PlaceType[]).map((t) => (
              <button key={t} onClick={() => setTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} aria-pressed={types.includes(t)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[14px] transition", types.includes(t) ? "border-brand bg-brand-soft font-bold text-fg" : "border-line text-muted")}>
                <span className={cn("h-2.5 w-2.5 rounded-full", DOT[t])} /> {PLACE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="p-2">
          <MapBoundary>
            <PlacesMap key={city} places={shown} focus={focus} user={user} center={CITY_CENTER[city] ?? CITY_CENTER.Warszawa} />
          </MapBoundary>
        </div>
      </Card>
      <div className="split-scroll min-w-0 space-y-2">
        <div className="text-[14px] text-muted">
          {sorted.length} {plural(sorted.length, "placówka", "placówki", "placówek")} {needle ? `dla „${q}”` : user ? "– od najbliższej" : `· ${city}`}
        </div>
        <ul className="space-y-2">
          {sorted.map((p) => (
            <li key={p.id}>
              <button onClick={() => (setFocus([p.lat, p.lng]), setSelected(p.id))} className={cn("flex w-full items-start gap-3 rounded-xl border bg-surface px-3.5 py-3 text-left transition hover:border-brand", selected === p.id ? "border-brand" : "border-line")}>
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", DOT[p.type])} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{p.name}</span>
                  <span className="block text-[13px] text-muted">
                    {p.address}, {p.city}
                  </span>
                  <span className="block text-[13px] text-fg-2">{p.note ?? PLACE_HINT[p.type]}</span>
                  {p.hours && <span className="block text-[12px] text-muted">{p.hours}</span>}
                </span>
                {user && <span className="num shrink-0 text-[13px] text-muted">{km(user, p).toFixed(1)} km</span>}
              </button>
            </li>
          ))}
        </ul>
        {!sorted.length && <p className="rounded-xl border border-dashed border-line p-4 text-[15px] text-muted">Brak placówek dla wybranych filtrów.</p>}
        <p className="text-[13px] text-muted">Dane demonstracyjne (6 miast, współrzędne przybliżone). W produkcji: rejestry placówek ZUS, USC i NFZ.</p>
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
export function KnowledgeTab({ openId }: { openId?: string | null } = {}) {
  const [article, setArticle] = useState<string | null>(openId ?? null);
  const [prevOpen, setPrevOpen] = useState(openId);
  if (openId !== prevOpen) {
    setPrevOpen(openId);
    if (openId) setArticle(openId);
  }
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
