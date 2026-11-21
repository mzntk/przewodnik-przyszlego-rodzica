"use client";
import { motion } from "framer-motion";
import { ArrowRight, Check, HeartHandshake, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MObywatelLogin } from "@/components/onboarding/mobywatel-login";
import { ZusLogo, homeFor } from "@/components/layout/app-shell";
import { useApp, profileKey } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "mama" as const, title: "Mama", text: "Uprawnienia, zasiłki, kalendarz ciąży i wnioski", icon: Sparkles },
  { id: "tata" as const, title: "Tata / Partner", text: "Formalności po porodzie i Twój urlop", icon: HeartHandshake },
];

/** Ekran startowy: wyłącznie logowanie (symulacja mObywatel) z wyborem roli. */
export function Landing() {
  const invited = useSearchParams().get("zaproszenie");
  const [role, setRole] = useState<"mama" | "tata">(invited ? "tata" : "mama");
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const router = useRouter();
  const { loggedIn, account, onboarded, profileId, login } = useApp();

  useEffect(() => {
    if (mounted && loggedIn) router.replace(homeFor(account, onboarded.includes(profileKey(profileId))));
  }, [mounted, loggedIn, account, onboarded, profileId, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="w-full max-w-[440px]">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex justify-center rounded-xl bg-white px-6 py-5">
            <ZusLogo className="h-12 sm:h-14" priority />
          </div>
          <h1 className="mt-7 text-center text-[24px] leading-tight font-semibold tracking-tight">Zasiłkowy Przewodnik Przyszłego Rodzica</h1>
          <p className="mt-2 text-center text-[16px] text-muted">Zaloguj się, aby zobaczyć swoje uprawnienia, terminy i świadczenia.</p>

          {invited && (
            <p className="mt-6 rounded-xl bg-green-soft px-4 py-3 text-[15px] text-fg-2">
              Masz zaproszenie od partnerki ({invited}). Zaloguj się jako <b>Tata / Partner</b>, aby zobaczyć udostępnione sekcje.
            </p>
          )}

          <fieldset className="mt-7">
            <legend className="mb-2.5 text-[14px] font-medium text-fg-2">Loguję się jako</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {ROLES.map((r) => {
                const active = role === r.id;
                return (
                  <button key={r.id} type="button" role="radio" aria-checked={active} onClick={() => setRole(r.id)} className={cn("relative rounded-xl border p-4 text-left transition", active ? "border-brand bg-green-soft" : "border-line hover:border-line-strong")}>
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
        <button onClick={() => (login("admin", "manual", null), router.replace("/admin"))} className="mx-auto mt-5 block text-[13px] text-muted underline-offset-4 hover:text-fg-2 hover:underline">
          Wejście dla administratora ZUS
        </button>
      </motion.div>
      <MObywatelLogin open={open} onOpenChange={setOpen} account={role} />
    </div>
  );
}
