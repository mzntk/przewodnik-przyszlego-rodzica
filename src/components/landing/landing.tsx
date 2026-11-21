"use client";
import { motion } from "framer-motion";
import { ArrowRight, Check, HeartHandshake, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MObywatelLogin } from "@/components/onboarding/mobywatel-login";
import { AppLogo, ZusLogo, homeFor } from "@/components/layout/app-shell";
import { ZusiaSays } from "@/components/bot/zusia";
import { useApp, profileKey } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "mama" as const, title: "Mama", text: "Uprawnienia, zasiłki, kalendarz ciąży i wnioski", icon: Sparkles },
  { id: "tata" as const, title: "Tata / Partner", text: "Formalności po porodzie, Twój urlop i wgląd w kalendarz ciąży", icon: HeartHandshake },
];

/** Ekran startowy: wyłącznie logowanie (symulacja mObywatel) z wyborem roli. */
export function Landing() {
  const invited = useSearchParams().get("zaproszenie");
  const [role, setRole] = useState<"mama" | "tata">(invited ? "tata" : "mama");
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const router = useRouter();
  const { loggedIn, account, onboarded, profileId, login, invite } = useApp();
  const motherName = useApp((s) => s.data.mother.firstName);

  useEffect(() => {
    if (mounted && loggedIn) router.replace(homeFor(account, onboarded.includes(profileKey(profileId))));
  }, [mounted, loggedIn, account, onboarded, profileId, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="w-full max-w-[440px]">
        <ZusiaSays variant="bundle" className="mb-2 px-1" imgClassName="size-28 sm:size-32">
          {invited ? (
            <>Cześć! Przyniosłam zaproszenie{mounted && invite?.code === invited && motherName ? <> od <b>{motherName}</b></> : ""}. Zaloguj się jako <b>Tata / Partner</b> – resztę podpowiem.</>
          ) : (
            <>Cześć, jestem <b className="text-brand">ZUSia</b>! Przyniosłam wszystko o zasiłkach, urlopach i terminach. Zaloguj się, a poprowadzę Cię krok po kroku.</>
          )}
        </ZusiaSays>
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AppLogo className="size-20 rounded-2xl sm:size-24" priority />
            <h1 className="text-[24px] leading-tight font-black tracking-tight text-brand sm:text-[26px]">Przewodnik Przyszłego Rodzica</h1>
          </div>
          <p className="mt-2 text-center text-[16px] text-muted">Zaloguj się, aby zobaczyć swoje uprawnienia, terminy i świadczenia.</p>

          {invited && (
            <p className="mt-6 rounded-xl bg-brand-soft px-4 py-3 text-[15px] text-fg-2">
              Masz zaproszenie do wspólnego konta rodziny (kod <b className="num">{invited}</b>). Zalogujesz się własnym mObywatelem i sam uzupełnisz swoje dane – np. wielkość firmy i zarobki.
            </p>
          )}

          <fieldset className="mt-7">
            <legend className="mb-2.5 text-[14px] font-medium text-fg-2">Loguję się jako</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const active = role === r.id;
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={active} onClick={() => setRole(r.id)} className={cn("relative min-w-0 rounded-xl border p-3.5 text-left transition sm:p-4", active ? "border-brand bg-brand-soft" : "border-line hover:border-line-strong")}>
                    {active && (
                      <motion.span layoutId="role-check" className="absolute top-3 right-3 grid h-5 w-5 place-items-center rounded-full bg-brand text-white" transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    )}
                    <r.icon className={cn("h-5 w-5", active ? "text-brand" : "text-muted")} />
                    <div className="mt-3 text-[17px] font-semibold">{r.title}</div>
                    <div className="mt-0.5 text-[13px] leading-snug text-muted">{r.text}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <button onClick={() => setOpen(true)} className="mt-6 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#d4213d] text-[17px] font-semibold text-white transition hover:bg-[#bd1c35] active:scale-[0.99]">
            <Smartphone className="h-5 w-5" /> Zaloguj przez mObywatel <ArrowRight className="h-4 w-4" />
          </button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5" /> Symulacja logowania · dane testowe są fikcyjne
          </p>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-muted">
          <span>Projekt dla</span>
          <ZusLogo className="h-5" />
        </div>
        <button onClick={() => (login("admin", "manual", null), router.replace("/admin"))} className="mx-auto mt-5 block text-[13px] text-muted underline-offset-4 hover:text-fg-2 hover:underline">
          Wejście dla administratora ZUS
        </button>
      </motion.div>
      <MObywatelLogin open={open} onOpenChange={setOpen} account={role} inviteCode={invited} />
    </div>
  );
}
