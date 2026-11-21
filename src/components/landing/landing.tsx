"use client";
import { motion } from "framer-motion";
import { ArrowRight, HeartHandshake, Link2, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MObywatelLogin, type LoginMode } from "@/components/onboarding/mobywatel-login";
import { TestModeBox } from "@/components/onboarding/test-mode";
import { AppLogo, ZusLogo, homeFor } from "@/components/layout/app-shell";
import { ZusiaSays } from "@/components/bot/zusia";
import { useApp, profileKey } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

const ROLE_TEXT = {
  mama: { icon: Sparkles, text: "Uprawnienia, zasiłki, kalendarz ciąży i wnioski" },
  tata: { icon: HeartHandshake, text: "Formalności po porodzie, Twój urlop i wgląd w kalendarz ciąży" },
} as const;

function Toggle<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-white p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)} className={cn("relative rounded-lg px-3 py-2.5 text-[15px] font-bold transition-colors", active ? "text-white" : "text-fg-2 hover:bg-surface-2")}>
            {active && <motion.span layoutId={`toggle-${label}`} className="absolute inset-0 rounded-lg bg-brand" transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Ekran startowy: Zaloguj się / Zarejestruj się × Mama / Tata (symulacja mObywatel). */
export function Landing() {
  const invited = useSearchParams().get("zaproszenie");
  const [mode, setMode] = useState<LoginMode>(invited ? "register" : "login");
  const [role, setRole] = useState<"mama" | "tata">(invited ? "tata" : "mama");
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const router = useRouter();
  const { loggedIn, account, onboarded, profileId, login, invite } = useApp();
  const motherName = useApp((s) => s.data.mother.firstName);
  const dadNeedsInvite = mode === "register" && role === "tata" && !invited;
  const R = ROLE_TEXT[role];

  useEffect(() => {
    if (mounted && loggedIn) router.replace(homeFor(account, onboarded.includes(profileKey(profileId))));
  }, [mounted, loggedIn, account, onboarded, profileId, router]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 26 }} className="w-full max-w-[440px]">
        <ZusiaSays variant="bundle" className="mb-2 px-1" imgClassName="size-28 sm:size-32">
          {invited ? (
            <>Cześć! Przyniosłam zaproszenie{mounted && invite?.code === invited && motherName ? <> od <b>{motherName}</b></> : ""}. Zarejestruj się jako <b>Tata</b> – resztę podpowiem.</>
          ) : mode === "register" ? (
            <>Witaj! Dane osobowe i ubezpieczeniowe pobiorę z <b>mObywatela i ZUS</b> – Ty wpiszesz tylko to, co dotyczy dziecka.</>
          ) : (
            <>Cześć, jestem <b className="text-brand">ZUSia</b>! Przyniosłam wszystko o zasiłkach, urlopach i terminach. Zaloguj się, a poprowadzę Cię krok po kroku.</>
          )}
        </ZusiaSays>
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <AppLogo className="size-20 rounded-2xl sm:size-24" priority />
            <h1 className="text-[24px] leading-tight font-black tracking-tight text-brand sm:text-[26px]">Przewodnik Przyszłego Rodzica</h1>
          </div>

          <div className="mt-6 space-y-2.5">
            <Toggle label="Rodzaj" value={mode} onChange={setMode} options={[{ value: "login", label: "Zaloguj się" }, { value: "register", label: "Zarejestruj się" }]} />
            <Toggle label="Rola" value={role} onChange={setRole} options={[{ value: "mama", label: "Mama" }, { value: "tata", label: "Tata" }]} />
          </div>
          <p className="mt-3 flex items-start gap-2 text-[14px] text-muted">
            <R.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> {R.text}
          </p>

          {dadNeedsInvite ? (
            <div className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-[15px] text-fg-2">
              <div className="flex items-center gap-2 font-bold text-brand">
                <Link2 className="h-4 w-4" /> Tata rejestruje się z linku zaproszenia
              </div>
              <p className="mt-1">Poproś mamę o link: <b>Ustawienia → Partner → „Utwórz link zaproszenia”</b>. Po jego otwarciu zarejestrujesz się swoim mObywatelem i sam uzupełnisz swoje dane. Masz już konto? Wybierz „Zaloguj się”.</p>
            </div>
          ) : (
            <>
              {invited && (
                <p className="mt-5 rounded-xl bg-brand-soft px-4 py-3 text-[15px] text-fg-2">
                  Zaproszenie do wspólnego konta rodziny (kod <b className="num">{invited}</b>). Zarejestrujesz się własnym mObywatelem i sam uzupełnisz swoje dane – np. wielkość firmy i zarobki.
                </p>
              )}
              <button onClick={() => setOpen(true)} className="mt-5 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-[#d4213d] text-[17px] font-semibold text-white transition hover:bg-[#bd1c35] active:scale-[0.99]">
                <Smartphone className="h-5 w-5" /> {mode === "login" ? "Zaloguj" : "Zarejestruj"} przez mObywatel <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[13px] text-muted">
            <ShieldCheck className="h-3.5 w-3.5" /> Symulacja logowania · dane są fikcyjne
          </p>
        </div>

        <TestModeBox className="mt-4" />

        <button onClick={() => (login("admin", "manual", null), router.replace("/admin"))} className="mx-auto mt-5 block text-[13px] text-muted underline-offset-4 hover:text-fg-2 hover:underline">
          Wejście dla administratora ZUS
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-muted">
          <span>Projekt dla</span>
          <ZusLogo className="h-5" />
        </div>
      </motion.div>
      <MObywatelLogin open={open} onOpenChange={setOpen} account={role} mode={mode} inviteCode={invited} />
    </div>
  );
}
