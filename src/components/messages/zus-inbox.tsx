"use client";
import { Building2, Mail, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { Button } from "@/components/ui/button";
import { deliver } from "@/components/notifications/notifications";
import { cn } from "@/lib/utils";

const TOPICS = ["Zasiłek macierzyński", "Urlop rodzicielski", "Zaświadczenie Z-3", "Składki i zaległości", "Inne"];

/** Odpowiedź ZUS (symulacja) – w produkcji przychodzi przez PUE/eZUS i trafia do tej skrzynki. */
function autoReply(text: string, topic: string): string {
  const t = `${topic} ${text}`.toLowerCase();
  if (/z-3|zaświadcz|pracodawc/.test(t)) return "Dzień dobry, uprzejmie informujemy, że zaświadczenie płatnika Z-3 wpłynęło do ZUS i zostało dołączone do Pani sprawy. Nie są wymagane dodatkowe dokumenty. Z poważaniem, Wydział Zasiłków ZUS.";
  if (/zaległ|składk|dług/.test(t)) return "Dzień dobry, aktualny stan rozliczeń jest dostępny w PUE/eZUS w zakładce Płatnik → Stan rozliczeń. Po spłacie całości zadłużenia wypłata zasiłku zostanie wznowiona. Z poważaniem, ZUS.";
  if (/rodziciel|81,5|urlop/.test(t)) return "Dzień dobry, wniosek o zasiłek za okres urlopu rodzicielskiego może Pani złożyć wraz z wnioskiem o zasiłek macierzyński. Wariant 81,5% wymaga złożenia wniosku najpóźniej 21 dni po porodzie. Z poważaniem, ZUS.";
  return "Dzień dobry, dziękujemy za wiadomość. Sprawa została przekazana do właściwego wydziału – odpowiedź otrzyma Pani w PUE/eZUS. Z poważaniem, Zakład Ubezpieczeń Społecznych.";
}

/** Skrzynka wiadomości PUE/eZUS: pytanie → odpowiedź ZUS trafia TUTAJ, pod dzwonek i (jeśli włączone) na e-mail. */
export function ZusInbox({ seed }: { seed?: { from: string; date: string; text: string }[] }) {
  const { zusMessages, addZusMessage, readZusMessages, pushNotification, email, notifyPrefs } = useApp();
  const [text, setText] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const end = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current || !seed?.length || useApp.getState().zusMessages.length) return;
    seeded.current = true;
    for (const m of seed) addZusMessage({ from: "zus", text: m.text, at: new Date(m.date).toISOString(), topic: m.from, read: true });
  }, [seed, addZusMessage]);
  useEffect(() => {
    readZusMessages();
    end.current?.scrollIntoView({ block: "nearest" });
  }, [zusMessages.length, readZusMessages]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    addZusMessage({ from: "ja", text: q, topic });
    setText("");
    toast.success("Wysłano do ZUS przez PUE/eZUS", { description: "Odpowiedź pojawi się w tej skrzynce i pod dzwonkiem." });
    // symulacja: ZUS odpowiada po chwili (w rzeczywistości do kilku dni roboczych)
    setTimeout(() => {
      const reply = autoReply(q, topic);
      useApp.getState().addZusMessage({ from: "zus", text: reply, topic, read: false });
      const n = { id: `zus-${Date.now()}`, kind: "system" as const, title: "Nowa odpowiedź z ZUS", body: reply.slice(0, 110) + "…", href: "/ustawienia#wiadomosci" };
      if (pushNotification(n)) deliver({ ...n, at: "", read: false }, { left: 1 }, () => window.location.assign(n.href), "wiadomosci");
    }, 9000);
  }

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-[14px] text-fg-2">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <span>
          Odpowiedzi ZUS trafiają <b>tutaj</b>, pod <b>dzwonek</b> w aplikacji{notifyPrefs.wiadomosci.email && email ? <> i na e-mail <b>{email}</b></> : <> – a po podaniu adresu w zakładce Konto także na <b>e-mail</b></>}. W wersji mobilnej – jako powiadomienie push.
        </span>
      </p>
      <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-line bg-surface p-3">
        {zusMessages.length === 0 && <p className="py-6 text-center text-[15px] text-muted">Brak wiadomości. Zadaj pytanie – np. czy ZUS otrzymał już Z-3 od pracodawcy.</p>}
        {zusMessages.map((m) => (
          <div key={m.id} className={cn("flex", m.from === "ja" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[88%] rounded-xl px-3.5 py-2.5 text-[15px] leading-relaxed", m.from === "ja" ? "bg-brand text-white" : "border border-line bg-white")}>
              <div className={cn("mb-1 flex items-center gap-1.5 text-[12px]", m.from === "ja" ? "text-white/80" : "text-muted")}>
                {m.from === "zus" && <Building2 className="h-3 w-3" />}
                {m.from === "ja" ? "Ty" : "ZUS"} · {m.topic ? `${m.topic} · ` : ""}
                {new Date(m.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="space-y-2">
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-[15px]" aria-label="Temat wiadomości">
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Napisz pytanie do ZUS…" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-3 text-[15px] outline-none focus:border-brand" />
          <Button type="submit" className="h-11" disabled={!text.trim()}>
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">Wyślij</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
