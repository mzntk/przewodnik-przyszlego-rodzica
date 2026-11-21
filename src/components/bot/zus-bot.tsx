"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AiBadge, LegalChip } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ZusiaAvatar } from "./zusia";

interface Msg {
  role: "user" | "assistant";
  content: string;
  links?: { label: string; href: string }[];
  sources?: { id: string; q: string; legal?: string }[];
  ai?: boolean;
  note?: string;
}

const SUGGESTIONS = ["Kto wypłaci mój zasiłek?", "Ile wynosi zasiłek macierzyński?", "Czy mogę łączyć rodzicielski z pracą?", "Mam zaległość w ZUS – co teraz?"];

export function ZusBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Cześć! Jestem ZUSia 🕊️ – bocianica z ZUS. Odpowiadam prostym językiem na podstawie Poradnika ZUS dla rodziców 2026. Kwoty liczy kalkulator – podpowiem, gdzie go znaleźć." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const history = msgs.filter((m, i) => i > 0).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/bot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: text, history }) });
      const j = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: j.answer ?? j.error, links: j.links, sources: j.sources, ai: j.ai, note: j.note }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Ups – brak połączenia. Spróbuj ponownie." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileTap={{ scale: 0.94 }}
        className="no-print fixed right-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 flex h-12 items-center gap-2 rounded-full border-2 border-brand bg-white pr-4 pl-1 text-[15px] font-bold text-brand shadow-card lg:right-6 lg:bottom-6"
        aria-label="Otwórz czat z ZUSią"
      >
        <ZusiaAvatar className="size-10 border-0" />
        <span className="hidden sm:inline">Zapytaj ZUSię</span>
        <span className="sm:hidden">ZUSia</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-x-2 bottom-2 z-50 flex h-[min(640px,85dvh)] flex-col overflow-hidden rounded-2xl border border-line-strong bg-bg-elevated shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px]"
            role="dialog"
            aria-label="Czat z ZUSią"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line bg-brand-soft px-4 py-3">
              <div className="flex items-center gap-2.5">
                <ZusiaAvatar className="size-11" />
                <div>
                  <div className="text-[16px] font-black text-brand">ZUSia</div>
                  <AiBadge />
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2" aria-label="Zamknij">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[88%] rounded-xl px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-line", m.role === "user" ? "bg-brand text-white" : "border border-line bg-surface")}>
                    {m.content}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.sources.filter((s) => s.legal).map((s) => (
                          <LegalChip key={s.id}>{s.legal}</LegalChip>
                        ))}
                      </div>
                    )}
                    {m.links && m.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg bg-brand-soft px-2 py-1 text-[13px] font-bold text-brand hover:opacity-80">
                            {l.label} →
                          </Link>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && i > 0 && <div className="mt-1.5 text-[12px] text-muted">{m.note ?? (m.ai ? "Odpowiedź AI na podstawie bazy wiedzy" : "Odpowiedź z bazy wiedzy")}</div>}
                  </div>
                </motion.div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-[15px] text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" /> ZUSia szuka w Poradniku…
                </div>
              )}
              {msgs.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[14px] text-fg-2 hover:border-line-strong">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={end} />
            </div>
            <p className="flex items-center gap-1.5 border-t border-line px-4 pt-2 text-[12px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand" /> Nie podawaj PESEL ani danych o zdrowiu – ZUSia i tak je ukrywa przed wysłaniem (RODO).
            </p>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 p-3 pt-2">
              <input value={input} maxLength={500} onChange={(e) => setInput(e.target.value)} placeholder="Zapytaj o zasiłki, urlopy, terminy…" className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-sm outline-none focus:border-line-strong" />
              <button type="submit" disabled={!input.trim() || busy} className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white disabled:opacity-30" aria-label="Wyślij">
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
