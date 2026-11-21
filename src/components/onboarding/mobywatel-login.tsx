"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Fingerprint, HeartHandshake, Loader2, PenLine, ScanLine, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TEST_PROFILES } from "@/data/profiles";
import { useApp, profileKey, type Account } from "@/store/app";
import { cn } from "@/lib/utils";

/** Kod QR do symulacji (wzór graficzny z wzorcami pozycjonującymi – nie koduje danych). */
function FakeQr({ seed, className }: { seed: number; className?: string }) {
  const N = 29;
  const cells = useMemo(() => {
    let x = seed || 1;
    const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
    const finder = (r: number, c: number) => {
      for (const [fr, fc] of [[0, 0], [0, N - 7], [N - 7, 0]]) {
        const dr = r - fr, dc = c - fc;
        if (dr >= -1 && dr <= 7 && dc >= -1 && dc <= 7) {
          if (dr < 0 || dc < 0 || dr > 6 || dc > 6) return 0;
          return dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) ? 1 : 0;
        }
      }
      return -1;
    };
    const out: [number, number][] = [];
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++) {
        const f = finder(r, c);
        if (f === 1 || (f === -1 && (r === 6 || c === 6 ? (r + c) % 2 === 0 : rnd() > 0.52))) out.push([r, c]);
      }
    return out;
  }, [seed]);
  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className={className} role="img" aria-label="Kod QR do zeskanowania w aplikacji mObywatel">
      <rect x={-2} y={-2} width={N + 4} height={N + 4} fill="#fff" />
      {cells.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c} y={r} width={1.02} height={1.02} fill="#111827" />
      ))}
    </svg>
  );
}

export function MObywatelLogin({ open, onOpenChange, account, inviteCode }: { open: boolean; onOpenChange: (v: boolean) => void; account: Exclude<Account, "admin">; inviteCode?: string | null }) {
  const [step, setStep] = useState<"qr" | "scanned" | "profile">("qr");
  const [seed, setSeed] = useState(1);
  const { login, invite, setInvite, profileId: familyProfile } = useApp();
  const motherName = useApp((s) => `${s.data.mother.firstName} ${s.data.mother.lastName}`.trim());
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    // nowy, jednorazowy kod QR przy każdym otwarciu (synchronizacja z zewnętrznym stanem „open”)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("qr");
    setSeed(Math.floor(Math.random() * 1e9));
    const t = setTimeout(() => setStep((s) => (s === "qr" ? "scanned" : s)), 6000);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (step !== "scanned") return;
    const t = setTimeout(() => setStep("profile"), 1200);
    return () => clearTimeout(t);
  }, [step]);

  const profiles = account === "tata" ? TEST_PROFILES.filter((p) => p.input.father) : TEST_PROFILES;
  const pendingInvite = account === "tata" && invite && !invite.completedAt && (!inviteCode || inviteCode === invite.code) ? invite : null;

  function choose(id: string | null) {
    login(account, id ? "mobywatel" : "manual", id);
    onOpenChange(false);
    const onboarded = useApp.getState().onboarded.includes(profileKey(id));
    toast.success(account === "tata" ? "Zalogowano na konto partnera" : "Zalogowano przez mObywatel (symulacja)");
    router.replace(account === "mama" && !onboarded ? "/start" : "/panel");
  }

  function joinFamily() {
    if (!pendingInvite) return;
    login("tata", "mobywatel", familyProfile, { joinFamily: true });
    setInvite({ ...pendingInvite, joinedAt: pendingInvite.joinedAt ?? new Date().toISOString() });
    onOpenChange(false);
    toast.success("Dołączono do konta rodziny");
    router.replace("/start");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Logowanie przez mObywatel" description="Symulacja – w środowisku produkcyjnym: login.gov.pl / Węzeł Krajowy.">
      <AnimatePresence mode="wait">
        {step !== "profile" ? (
          <motion.div key="qr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-col items-center py-4 text-center">
            <div className="relative rounded-2xl border border-line bg-white p-3 shadow-card">
              <FakeQr seed={seed} className={cn("size-52 transition sm:size-60", step === "scanned" && "opacity-20 blur-[1px]")} />
              {step === "qr" && <motion.span className="absolute inset-x-3 h-0.5 bg-[#d4213d]/80 shadow-[0_0_12px_#d4213d]" initial={{ top: "8%" }} animate={{ top: ["8%", "92%", "8%"] }} transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }} />}
              {step === "scanned" && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="absolute inset-0 m-auto grid size-16 place-items-center rounded-full bg-brand text-white">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </motion.span>
              )}
            </div>
            <ol className="mt-5 space-y-1.5 text-left text-[15px] text-fg-2">
              <li className="flex gap-2"><Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#d4213d]" /> Otwórz aplikację <b>mObywatel</b> w telefonie.</li>
              <li className="flex gap-2"><ScanLine className="mt-0.5 h-4 w-4 shrink-0 text-[#d4213d]" /> Wybierz <b>Kod QR → Zaloguj się</b> i zeskanuj kod.</li>
              <li className="flex gap-2"><Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-[#d4213d]" /> Potwierdź logowanie w telefonie.</li>
            </ol>
            <div className="mt-5 flex items-center gap-2 text-[15px] text-muted">
              {step === "scanned" ? (
                <span className="font-bold text-brand">Kod zeskanowany – potwierdzanie tożsamości…</span>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Oczekiwanie na zeskanowanie…
                </>
              )}
            </div>
            {step === "qr" && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setStep("scanned")}>
                Symuluj zeskanowanie telefonem
              </Button>
            )}
            <p className="mt-3 text-[12px] text-muted">Kod jest jednorazowy i ważny 2 minuty. Logujesz się na komputerze? Zeskanuj go telefonem. Na telefonie – aplikacja mObywatel otworzy się sama.</p>
          </motion.div>
        ) : (
          <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-[15px] font-medium text-brand">
              <Fingerprint className="h-4 w-4 shrink-0" /> Tożsamość potwierdzona. {account === "tata" ? "Wybierz rodzinę, z którą powiązane jest Twoje konto:" : "Wybierz profil testowy (dane fikcyjne):"}
            </div>
            {pendingInvite && (
              <button onClick={joinFamily} className="flex w-full items-start gap-3 rounded-xl border-2 border-brand bg-brand-soft p-3.5 text-left">
                <HeartHandshake className="mt-0.5 h-6 w-6 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold">Dołącz do rodziny – zaproszenie od {motherName || "partnerki"}</span>
                  <span className="mt-0.5 block text-[14px] text-fg-2">Kod {pendingInvite.code}. Po zalogowaniu sam uzupełnisz swoje dane: rodzaj umowy, wielkość firmy, zarobki.</span>
                </span>
              </button>
            )}
            {profiles.map((p, i) => {
              const f = p.input.father;
              return (
                <motion.button key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => choose(p.id)} className={cn("group flex w-full items-start gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition hover:border-brand hover:bg-surface-2")}>
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
                  <Check className="mt-1 h-4 w-4 text-brand opacity-0 transition group-hover:opacity-100" />
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
