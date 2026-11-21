"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, LogOut, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { navFor, mobileTabsFor, canAccess } from "./nav";
import { useApp, profileKey, type Account } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { Sheet } from "@/components/ui/sheet";
import { ZusBot } from "@/components/bot/zus-bot";
import { Button } from "@/components/ui/button";
import { CaseSheet } from "@/components/cases/case-ui";
import { NotificationBell, useBackgroundSync } from "@/components/notifications/notifications";

export function ZusLogo({ className, priority }: { className?: string; priority?: boolean }) {
  return <Image src="/logo-zus.png" alt="Zakład Ubezpieczeń Społecznych" width={4200} height={944} priority={priority} className={cn("h-7 w-auto", className)} />;
}

export const homeFor = (account: Account | null, onboarded: boolean) => (account === "admin" ? "/admin" : account === "mama" && !onboarded ? "/start" : "/panel");

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { account, access } = useApp();
  return (
    <nav className="space-y-6" aria-label="Menu główne">
      {navFor(account, access).map((g, gi) => (
        <div key={gi}>
          {g.title && <div className="mb-1.5 px-3 text-[13px] font-bold text-muted">{g.title}</div>}
          <div className="flex flex-col gap-0.5">
            {g.items.map((n) => {
              const active = path === n.href || path.startsWith(`${n.href}/`);
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[16px] transition-colors", active ? "font-bold text-fg" : "text-fg-2 hover:bg-surface-2 hover:text-fg")}>
                  {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-lg bg-green-soft" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} />}
                  <Icon className={cn("relative h-5 w-5", active ? "text-brand" : "text-muted")} strokeWidth={active ? 2.2 : 1.8} />
                  <span className="relative">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AccountCard() {
  const { data, account, logout } = useApp();
  const router = useRouter();
  const name = account === "admin" ? "Administrator ZUS" : account === "tata" ? `${data.father?.firstName ?? "Partner"} ${data.father?.lastName ?? ""}`.trim() : `${data.mother.firstName} ${data.mother.lastName}`.trim() || "Moje konto";
  const sub = account === "admin" ? "Administrator" : account === "tata" ? "Konto partnera" : "Konto mamy";
  return (
    <div className="flex items-center gap-3 border-t border-line px-3 pt-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-[14px] font-bold text-fg-2">{name.split(" ").map((x) => x[0]).join("").slice(0, 2)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold">{name}</div>
        <div className="truncate text-[13px] text-muted">{sub}</div>
      </div>
      <button onClick={() => (logout(), router.replace("/"))} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg" aria-label="Wyloguj się" title="Wyloguj się">
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function Signed({ children }: { children: React.ReactNode }) {
  useBackgroundSync();
  return (
    <>
      {children}
      <CaseSheet />
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const mounted = useMounted();
  const { loggedIn, account, access, onboarded, profileId, logout } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);
  const isOnboarded = onboarded.includes(profileKey(profileId));
  const bare = path === "/" || path.startsWith("/start");

  // Strażnik: niezalogowani → logowanie; mama bez konfiguracji → kreator
  useEffect(() => {
    if (!mounted) return;
    if (!loggedIn && path !== "/") router.replace("/");
    else if (loggedIn && account === "mama" && !isOnboarded && !path.startsWith("/start") && path !== "/") router.replace("/start");
    else if (loggedIn && path.startsWith("/start") && account !== "mama") router.replace(homeFor(account, true));
  }, [mounted, loggedIn, account, isOnboarded, path, router]);

  if (bare) return <div className="min-h-dvh bg-bg">{children}</div>;
  // Przed hydratacją renderujemy segment strony ukryty (prerender/instant navigation), po hydratacji działa strażnik
  if (!mounted)
    return (
      <div className="min-h-dvh bg-bg">
        <div hidden>{children}</div>
      </div>
    );
  if (!loggedIn) return <div className="min-h-dvh bg-bg" />;

  const allowed = canAccess(path, account, access);
  const tabs = mobileTabsFor(account, access);

  return (
    <Signed>
      <div className="min-h-dvh bg-bg">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] flex-col border-r border-line bg-white px-3 py-6 lg:flex">
          <Link href="/panel" className="flex flex-col gap-2 px-3" aria-label="Start">
            <ZusLogo className="h-8" />
            <span className="text-[13px] text-muted">Zasiłkowy Przewodnik Przyszłego Rodzica</span>
          </Link>
          <div className="mt-8 flex-1 overflow-y-auto">
            <NavGroups />
          </div>
          <AccountCard />
        </aside>

        <header className="sticky top-0 z-20 border-b border-line bg-white lg:ml-[272px]">
          <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-8">
            <Link href="/panel" className="lg:hidden" aria-label="Start">
              <ZusLogo className="h-7" />
            </Link>
            <div className="hidden lg:block" />
            <div className="flex items-center gap-1">
              {account !== "admin" && <NotificationBell />}
              <button onClick={() => setMoreOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg text-fg-2 hover:bg-surface-2 lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="lg:ml-[272px]">
          <div className="mx-auto max-w-[1180px] px-4 pt-8 pb-32 sm:px-8 sm:pt-10 lg:pb-20">
            {allowed ? (
              children
            ) : (
              <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center">
                <Lock className="mx-auto h-8 w-8 text-muted" />
                <h1 className="mt-4 text-[22px] font-bold">Ta sekcja nie jest dostępna</h1>
                <p className="mt-2 text-[16px] text-fg-2">{account === "tata" ? "Mama nie udostępniła tej sekcji. Może to zmienić w swoich ustawieniach." : "Nie masz uprawnień do tej sekcji."}</p>
                <Link href={homeFor(account, true)}>
                  <Button className="mt-6">Wróć na start</Button>
                </Link>
              </div>
            )}
          </div>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-between border-t border-line bg-white px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] lg:hidden" aria-label="Menu dolne">
          {tabs.map((n) => {
            const active = path === n.href || path.startsWith(`${n.href}/`);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[12px]", active ? "font-bold text-brand" : "text-muted")}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {n.short}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-1.5 text-[12px] text-muted">
            <Menu className="h-5 w-5" strokeWidth={1.8} />
            Więcej
          </button>
        </nav>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="Menu">
          <NavGroups onNavigate={() => setMoreOpen(false)} />
          <div className="mt-6 border-t border-line pt-4">
            <Button variant="secondary" className="w-full" onClick={() => (logout(), setMoreOpen(false), router.replace("/"))}>
              <LogOut className="h-4 w-4" /> Wyloguj się
            </Button>
          </div>
        </Sheet>

        <ZusBot />
      </div>
    </Signed>
  );
}
