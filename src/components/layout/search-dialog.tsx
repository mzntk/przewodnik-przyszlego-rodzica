"use client";
import { Dialog } from "radix-ui";
import { BookOpen, FileText, HelpCircle, Phone, Search, SquareArrowOutUpRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GLOSSARY } from "@/data/glossary";
import { KNOWLEDGE } from "@/data/knowledge";
import { GUIDES } from "@/data/documents";
import { ARTICLES } from "@/data/organize";
import { HOTLINES } from "@/data/support";
import { useApp } from "@/store/app";
import { navFor, resolveHref } from "./nav";
import { cn } from "@/lib/utils";

type Kind = "strona" | "pojęcie" | "pytanie" | "druk" | "poradnik" | "telefon";
interface Entry {
  id: string;
  kind: Kind;
  title: string;
  text?: string;
  hay: string;
  href?: string;
  caseId?: string;
}

const ICON: Record<Kind, typeof Search> = { strona: SquareArrowOutUpRight, pojęcie: HelpCircle, pytanie: HelpCircle, druk: FileText, poradnik: BookOpen, telefon: Phone };
const LABEL: Record<Kind, string> = { strona: "Sekcja", pojęcie: "Pojęcie", pytanie: "Pytanie i odpowiedź", druk: "Druk / wniosek", poradnik: "Poradnik", telefon: "Telefon" };

/** Normalizacja: małe litery, bez polskich znaków – „zasilek” znajdzie „zasiłek”. */
export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

function useIndex(): Entry[] {
  const { account, access } = useApp();
  return useMemo(() => {
    const e: Entry[] = [];
    for (const g of navFor(account, access)) for (const n of g.items) e.push({ id: `nav-${n.href}`, kind: "strona", title: n.label, hay: `${n.label} ${n.short} ${g.title}`, href: n.href });
    if (account === "admin") return e;
    for (const [id, g] of Object.entries(GLOSSARY)) e.push({ id: `g-${id}`, kind: "pojęcie", title: g.term, text: g.what, hay: `${g.term} ${g.what} ${g.who}` });
    for (const k of KNOWLEDGE) e.push({ id: `k-${k.id}`, kind: "pytanie", title: k.q, text: k.a, hay: `${k.q} ${k.keywords.join(" ")} ${k.a}`, href: k.links?.[0]?.href });
    for (const g of Object.values(GUIDES)) e.push({ id: `d-${g.id}`, kind: "druk", title: `${g.code} – ${g.name}`, text: g.howTo[0], hay: `${g.code} ${g.name} ${g.legal}`, caseId: g.id });
    for (const a of ARTICLES) e.push({ id: `a-${a.id}`, kind: "poradnik", title: a.title, text: a.lead, hay: `${a.title} ${a.lead} ${a.category} ${a.body.join(" ")}`, href: "/ciaza" });
    for (const h of HOTLINES) e.push({ id: `t-${h.number}`, kind: "telefon", title: `${h.name}: ${h.number}`, text: h.note, hay: `${h.name} ${h.note} telefon numer`, href: `tel:${h.number.replace(/\s/g, "")}` });
    return e.map((x) => ({ ...x, hay: norm(x.hay) }));
  }, [account, access]);
}

export function SearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "k") {
        ev.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("grid h-10 w-10 place-items-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2", className)} aria-label="Szukaj w aplikacji" title="Szukaj (Ctrl+K)">
        <Search className="h-5 w-5" />
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const index = useIndex();
  const router = useRouter();
  const { openCase, account, access } = useApp();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const tokens = norm(q).split(/\s+/).filter((t) => t.length >= 2);
  const results = tokens.length
    ? index
        .map((x) => ({ x, score: tokens.every((t) => x.hay.includes(t)) ? tokens.reduce((s, t) => s + (norm(x.title).includes(t) ? 3 : 1), 0) : 0 }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30)
        .map((r) => r.x)
    : [];

  function go(e: Entry) {
    if (e.kind === "pojęcie" || (e.kind === "pytanie" && expanded !== e.id)) return setExpanded(expanded === e.id ? null : e.id);
    onOpenChange(false);
    if (e.caseId) {
      router.push(resolveHref("/wnioski", account, access));
      openCase(e.caseId);
    } else if (e.href?.startsWith("tel:")) window.location.assign(e.href);
    else if (e.href) router.push(resolveHref(e.href, account, access));
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (onOpenChange(v), v || (setQ(""), setExpanded(null)))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content className="fixed inset-x-2 top-2 z-[61] mx-auto flex max-h-[calc(100dvh-1rem)] max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:top-[10vh] sm:max-h-[75vh]" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Szukaj w aplikacji</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="h-5 w-5 shrink-0 text-brand" />
            <input autoFocus value={q} onChange={(e) => (setQ(e.target.value), setExpanded(null))} placeholder="Wpisz słowo, np. ojcowski, Z-3, 800+, położna…" className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted" />
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Zamknij">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!tokens.length && <p className="px-3 py-6 text-center text-[15px] text-muted">Szukaj sekcji, pojęć, druków, poradników i telefonów. Skrót: Ctrl/⌘ + K.</p>}
            {tokens.length > 0 && !results.length && <p className="px-3 py-6 text-center text-[15px] text-muted">Nic nie znaleziono dla „{q}”. Spróbuj innego słowa albo zapytaj ZUSię.</p>}
            <ul>
              {results.map((r) => {
                const Icon = ICON[r.kind];
                const open = expanded === r.id;
                return (
                  <li key={r.id}>
                    <button onClick={() => go(r)} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2", open && "bg-brand-soft")}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-snug font-bold">{r.title}</span>
                        <span className="block text-[12px] text-muted">{LABEL[r.kind]}</span>
                        {r.text && <span className={cn("mt-1 block text-[14px] leading-snug text-fg-2", !open && "line-clamp-2")}>{r.text}</span>}
                        {open && r.href && <span className="mt-1.5 block text-[13px] font-bold text-brand">Kliknij ponownie, aby przejść →</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
