"use client";
import { Dialog } from "radix-ui";
import { AlertTriangle, BookOpen, ClipboardList, FileText, HandHeart, HelpCircle, MapPin, Phone, Search, Sparkles, SquareArrowOutUpRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CORPUS, type CorpusKind } from "@/data/corpus";
import { prepare, search } from "@/lib/search";
import { useApp } from "@/store/app";
import { navFor, resolveHref } from "./nav";
import { cn } from "@/lib/utils";

export { norm } from "@/lib/search";

type Kind = CorpusKind | "strona";

interface Entry {
  id: string;
  kind: Kind;
  title: string;
  text?: string;
  answer?: string;
  keywords?: string[];
  href?: string;
  caseId?: string;
}

const ICON: Record<Kind, typeof Search> = { strona: SquareArrowOutUpRight, sekcja: SquareArrowOutUpRight, pojęcie: HelpCircle, pytanie: HelpCircle, druk: FileText, poradnik: BookOpen, lista: ClipboardList, ryzyko: AlertTriangle, telefon: Phone, organizacja: HandHeart, funkcja: Sparkles, miejsce: MapPin };
const LABEL: Record<Kind, string> = { strona: "Sekcja aplikacji", sekcja: "Sekcja aplikacji", pojęcie: "Pojęcie", pytanie: "Pytanie i odpowiedź", druk: "Druk / wniosek", poradnik: "Poradnik", lista: "Lista", ryzyko: "Na co uważać", telefon: "Telefon", organizacja: "Organizacja pomocowa", funkcja: "Jak to zrobić w aplikacji", miejsce: "Placówka" };
const EXPANDABLE: Kind[] = ["pojęcie", "pytanie", "lista", "ryzyko", "funkcja"];
const EXAMPLES = ["co spakować do szpitala", "ile wynosi zasiłek", "urlop ojcowski", "jak dodać wizytę", "Z-3", "położna"];

function useIndex() {
  const { account, access } = useApp();
  return useMemo(() => {
    const nav: Entry[] = navFor(account, access).flatMap((g) => g.items.map((n) => ({ id: `nav-${n.href}`, kind: "strona" as const, title: n.label, keywords: [n.short, g.title], href: n.href })));
    return prepare<Entry>(account === "admin" ? nav : [...nav, ...CORPUS.filter((c) => c.kind !== "sekcja" || c.href?.includes("?"))]);
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
  // pokazujemy tylko trafne wyniki: co najmniej połowa istotnych słów zapytania
  const results = useMemo(() => (q.trim().length < 2 ? [] : search(index, q, 25).filter((h) => h.coverage >= 0.5)), [index, q]);

  function go(e: Entry) {
    onOpenChange(false);
    setQ("");
    setExpanded(null);
    if (e.caseId) {
      router.push(resolveHref("/wnioski", account, access));
      openCase(e.caseId);
    } else if (e.href?.startsWith("tel:")) window.location.assign(e.href);
    else if (e.href) router.push(resolveHref(e.href, account, access));
  }
  const click = (e: Entry) => (EXPANDABLE.includes(e.kind) && expanded !== e.id ? setExpanded(e.id) : e.href || e.caseId ? go(e) : setExpanded(expanded === e.id ? null : e.id));

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (onOpenChange(v), v || (setQ(""), setExpanded(null)))}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Dialog.Content className="fixed inset-x-2 top-2 z-[61] mx-auto flex max-h-[calc(100dvh-1rem)] max-w-[640px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl sm:top-[10vh] sm:max-h-[75vh]" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Szukaj w aplikacji</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="h-5 w-5 shrink-0 text-brand" />
            <input autoFocus value={q} onChange={(e) => (setQ(e.target.value), setExpanded(null))} placeholder="Czego szukasz? np. co spakować do szpitala" className="h-14 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted" />
            <Dialog.Close className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Zamknij">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {q.trim().length < 2 && (
              <div className="px-3 py-5">
                <p className="text-[15px] text-muted">Szukaj w całej aplikacji: zasiłki, druki, listy, poradniki, telefony, placówki. Możesz pisać pełnym zdaniem i bez polskich znaków.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {EXAMPLES.map((x) => (
                    <button key={x} onClick={() => setQ(x)} className="rounded-full border border-line px-3 py-1.5 text-[14px] text-fg-2 hover:border-brand">
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {q.trim().length >= 2 && !results.length && <p className="px-3 py-6 text-center text-[15px] text-muted">Nic nie znaleziono dla „{q}”. Spróbuj innymi słowami albo zapytaj ZUSię.</p>}
            <ul>
              {results.map(({ doc: r }) => {
                const Icon = ICON[r.kind];
                const isOpen = expanded === r.id;
                return (
                  <li key={r.id}>
                    <button onClick={() => click(r)} className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2", isOpen && "bg-brand-soft hover:bg-brand-soft")}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-snug font-bold">{r.title}</span>
                        <span className="block text-[12px] text-muted">{LABEL[r.kind]}</span>
                        {(r.answer || r.text) && <span className={cn("mt-1 block text-[14px] leading-snug whitespace-pre-line text-fg-2", !isOpen && "line-clamp-2")}>{isOpen ? (r.answer ?? r.text) : r.text}</span>}
                        {isOpen && (r.href || r.caseId) && <span className="mt-1.5 block text-[13px] font-bold text-brand">Kliknij ponownie, aby przejść →</span>}
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
