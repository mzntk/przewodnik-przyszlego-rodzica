"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Fingerprint, Loader2, PenLine, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEST_PROFILES } from "@/data/profiles";
import { useApp, profileKey, type Account } from "@/store/app";
import { cn } from "@/lib/utils";

export function MObywatelLogin({ open, onOpenChange, account }: { open: boolean; onOpenChange: (v: boolean) => void; account: Exclude<Account, "admin"> }) {
  const [step, setStep] = useState<"code" | "profile">("code");
  const [code, setCode] = useState("••••••");
  const login = useApp((s) => s.login);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // reset kreatora przy każdym otwarciu (synchronizacja z zewnętrznym stanem „open”)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("code");
    setCode(String(Math.floor(100000 + Math.random() * 900000)));
    const t = setTimeout(() => setStep("profile"), 1600);
    return () => clearTimeout(t);
  }, [open]);

  const profiles = account === "tata" ? TEST_PROFILES.filter((p) => p.input.father) : TEST_PROFILES;

  function choose(id: string | null) {
    login(account, id ? "mobywatel" : "manual", id);
    onOpenChange(false);
    const onboarded = useApp.getState().onboarded.includes(profileKey(id));
    toast.success(account === "tata" ? "Zalogowano na konto partnera" : "Zalogowano przez mObywatel (symulacja)");
    router.replace(account === "mama" && !onboarded ? "/start" : "/panel");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Logowanie przez mObywatel" description="Symulacja – w środowisku produkcyjnym: login.gov.pl / Węzeł Krajowy.">
      <AnimatePresence mode="wait">
        {step === "code" ? (
          <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col items-center py-8 text-center">
            <div className="relative grid h-20 w-20 place-items-center rounded-2xl bg-[#d4213d] text-white shadow-xl">
              <Smartphone className="h-9 w-9" />
              <motion.span className="absolute inset-0 rounded-2xl border-2 border-white/40" animate={{ scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }} />
            </div>
            <p className="mt-6 text-sm text-fg-2">Otwórz aplikację mObywatel i potwierdź logowanie kodem:</p>
            <div className="num mt-3 text-4xl font-semibold tracking-[0.3em]">{code}</div>
            <div className="mt-6 flex items-center gap-2 text-[15px] text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Oczekiwanie na potwierdzenie…
            </div>
          </motion.div>
        ) : (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-green-soft px-3 py-2.5 text-[15px] font-medium text-green">
              <Fingerprint className="h-4 w-4 shrink-0" /> Tożsamość potwierdzona. {account === "tata" ? "Wybierz rodzinę, z którą powiązane jest Twoje konto:" : "Wybierz profil testowy (dane fikcyjne):"}
            </div>
            {profiles.map((p, i) => {
              const f = p.input.father;
              return (
                <motion.button key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => choose(p.id)} className={cn("group flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-line-strong hover:bg-surface-2")}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-3 text-[15px] font-semibold">{account === "tata" && f ? `${f.firstName[0]}${f.lastName[0]}` : p.avatar}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{account === "tata" && f ? `${f.firstName} ${f.lastName}` : p.title}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-muted">{account === "tata" ? `Partner: ${p.input.mother.firstName} ${p.input.mother.lastName}` : p.subtitle}</span>
                    {account === "mama" && (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <Badge key={t.label} tone={t.tone}>
                            {t.label}
                          </Badge>
                        ))}
                      </span>
                    )}
                  </span>
                  <Check className="mt-1 h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" />
                </motion.button>
              );
            })}
            {account === "mama" && (
              <Button variant="outline" className="w-full" onClick={() => choose(null)}>
                <PenLine className="h-4 w-4" /> Nowe konto – wprowadzę dane ręcznie
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
