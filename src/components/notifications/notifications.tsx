"use client";
import { Bell, BellOff, CalendarClock, FileCheck2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useApp, type AppNotification, type NotifyTopic } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { useCases } from "@/components/cases/case-ui";
import { statusLabel } from "@/models/case-status";
import type { CaseState } from "@/models/case-status";
import { cn, plural } from "@/lib/utils";

const SYNC_EVERY_MS = 10_000;
const MAX_TOASTS_PER_RUN = 2;

const TOPIC_OF: Record<AppNotification["kind"], NotifyTopic> = { termin: "terminy", status: "statusy", system: "wiadomosci" };

/** Dostarczenie powiadomienia kanałami wybranymi w Ustawieniach → Powiadomienia (osobno dla każdego tematu). */
export function deliver(n: AppNotification, toastBudget: { left: number }, onOpen: () => void, topic: NotifyTopic = TOPIC_OF[n.kind]) {
  const { notify, notifyPrefs, email } = useApp.getState();
  const pref = notifyPrefs[topic];
  if (notify.inApp && pref.inApp && toastBudget.left > 0) {
    toastBudget.left--;
    toast(n.title, { description: n.body, duration: 3500, icon: n.kind === "status" ? <FileCheck2 className="h-4 w-4 text-brand" /> : <CalendarClock className="h-4 w-4 text-orange" />, action: { label: "Pokaż", onClick: onOpen } });
  }
  if (notify.push && pref.push && typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(n.title, { body: n.body, icon: "/brand/logo-aplikacji.png", tag: n.id });
  }
  if (pref.email && email) {
    void fetch("/api/notify/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: email, subject: `Przewodnik Przyszłego Rodzica: ${n.title}`, body: n.body }) }).catch(() => null);
  }
}

/** Synchronizacja statusów spraw z ZUS i alerty o zbliżających się terminach – działa w tle po zalogowaniu. */
export function useBackgroundSync() {
  const router = useRouter();
  const { account, profileId, pushNotification, setCases, openCase } = useApp();
  const { result } = useCalculation();
  const { items } = useCases();
  const ids = items.map((i) => i.guide.id).join(",");
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Terminy graniczne: 14, 7 i 3 dni przed oraz w dniu terminu
  useEffect(() => {
    if (!result || !account || account === "admin") return;
    const budget = { left: MAX_TOASTS_PER_RUN };
    for (const d of result.deadlines) {
      if (d.daysLeft < 0 || d.daysLeft > 14) continue;
      if (account === "tata" && d.who === "matka") continue;
      const bucket = d.daysLeft === 0 ? 0 : d.daysLeft <= 3 ? 3 : d.daysLeft <= 7 ? 7 : 14;
      const n = {
        id: `d-${d.id}-${d.date}-${bucket}`,
        kind: "termin" as const,
        title: d.daysLeft === 0 ? `Dziś mija termin: ${d.title}` : `Zostało ${d.daysLeft} ${plural(d.daysLeft, "dzień", "dni", "dni")}: ${d.title}`,
        body: d.description.split(". ")[0] + ".",
        href: "/wnioski",
      };
      if (pushNotification(n)) deliver({ ...n, at: "", read: false }, budget, () => router.push(n.href));
    }
  }, [result, account, pushNotification, router]);

  // Wizyty i wydarzenia z kalendarza – przypomnienie dzień wcześniej i w dniu wydarzenia
  const appointments = useApp((s) => s.appointments);
  useEffect(() => {
    if (!account || account === "admin") return;
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const budget = { left: 1 };
    for (const a of appointments) {
      if (a.date !== today && a.date !== tomorrow) continue;
      if (account === "tata" && !a.shared && a.author !== "tata") continue;
      const n = { id: `w-${a.id}-${a.date}`, kind: "termin" as const, title: `${a.date === today ? "Dziś" : "Jutro"}${a.time ? ` o ${a.time}` : ""}: ${a.title}`, body: a.place ? `Miejsce: ${a.place}` : "Wydarzenie z Twojego kalendarza ciąży.", href: "/ciaza" };
      if (pushNotification(n)) deliver({ ...n, at: "", read: false }, budget, () => router.push(n.href), "wizyty");
    }
  }, [appointments, account, pushNotification, router]);

  // Statusy spraw z ZUS
  useEffect(() => {
    if (!ids || !account || account === "admin") return;
    let alive = true;
    const sync = async () => {
      const before = useApp.getState().cases;
      const res = await fetch("/api/integrations/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId, cases: itemsRef.current.map((i) => ({ id: i.guide.id, state: before[i.guide.id] })) }),
      }).catch(() => null);
      if (!alive || !res?.ok) return;
      const { statuses, syncedAt } = (await res.json()) as { statuses: Record<string, CaseState>; syncedAt: string };
      setCases(statuses, syncedAt);
      const budget = { left: MAX_TOASTS_PER_RUN };
      for (const [id, st] of Object.entries(statuses)) {
        const prev = before[id]?.status ?? "niezlozony";
        if (st.status === prev || st.status === "niezlozony") continue;
        const item = itemsRef.current.find((i) => i.guide.id === id);
        if (!item) continue;
        const n = { id: `s-${id}-${st.status}-${st.updatedAt}`, kind: "status" as const, title: `Zmiana statusu: ${item.guide.code === "Wniosek" ? item.guide.name : item.guide.code}`, body: `${statusLabel(st.status, item.guide.to)}${st.note ? ` – ${st.note}` : ""}`, caseId: id };
        if (pushNotification(n)) deliver({ ...n, at: "", read: false }, budget, () => openCase(id));
      }
    };
    sync();
    const iv = setInterval(sync, SYNC_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [ids, account, profileId, setCases, pushNotification, openCase]);
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, markRead, openCase, notify } = useApp();
  const unread = notifications.filter((n) => !n.read).length;
  const open = (n: AppNotification) => {
    markRead(n.id);
    if (n.caseId) openCase(n.caseId);
    else if (n.href) router.push(n.href);
  };
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="relative grid h-10 w-10 place-items-center rounded-lg text-fg-2 transition-colors hover:bg-surface-2" aria-label={`Powiadomienia${unread ? `, ${unread} nieprzeczytanych` : ""}`}>
          {notify.inApp || notify.push ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          {unread > 0 && <span className="num absolute top-1 right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="z-[60] w-[min(380px,calc(100vw-24px))] rounded-xl border border-line bg-white shadow-card data-[state=open]:animate-[term-in_160ms_cubic-bezier(0.16,1,0.3,1)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[16px] font-bold">Powiadomienia</span>
            {unread > 0 && (
              <button onClick={() => markRead()} className="text-[14px] font-bold text-brand hover:underline">
                Oznacz jako przeczytane
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto py-1">
            {notifications.length === 0 && <li className="px-4 py-6 text-center text-[15px] text-muted">Brak powiadomień. Damy znać, gdy zbliży się termin lub zmieni status sprawy.</li>}
            {notifications.map((n) => (
              <li key={n.id}>
                <Popover.Close asChild>
                  <button onClick={() => open(n)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2", !n.read && "bg-green-soft/50")}>
                    <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", n.kind === "status" ? "bg-green-soft text-brand" : "bg-orange-soft text-orange")}>
                      {n.kind === "status" ? <FileCheck2 className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] leading-snug", !n.read ? "font-bold" : "text-fg-2")}>{n.title}</span>
                      <span className="mt-0.5 block text-[14px] leading-snug text-muted">{n.body}</span>
                      <span className="mt-1 block text-[12px] text-muted">{new Date(n.at).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </span>
                  </button>
                </Popover.Close>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
