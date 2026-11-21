"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Fingerprint, Loader2, ScanLine, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useApp, type Account } from "@/store/app";
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

export type LoginMode = "login" | "register";

const FETCHED = ["Imię, nazwisko i PESEL (mObywatel)", "Tytuł ubezpieczenia i ubezpieczenie chorobowe (ZUS)", "Płatnik składek i liczba ubezpieczonych", "Podstawa składek z 12 miesięcy", "Zwolnienia lekarskie e-ZLA i stan rozliczeń"];

export function MObywatelLogin({ open, onOpenChange, account, mode, inviteCode }: { open: boolean; onOpenChange: (v: boolean) => void; account: Exclude<Account, "admin">; mode: LoginMode; inviteCode?: string | null }) {
  const [step, setStep] = useState<"qr" | "scanned" | "done">("qr");
  const [seed, setSeed] = useState(1);
  const [who, setWho] = useState("");
  const { login, invite, setInvite, profileId: familyProfile, loginFamily, registerMama } = useApp();
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

  const pendingInvite = account === "tata" && invite && !invite.completedAt && (!inviteCode || inviteCode === invite.code) ? invite : null;
  const joining = account === "tata" && !!inviteCode && !!pendingInvite;

  // po zeskanowaniu: potwierdzenie tożsamości i wejście do aplikacji
  useEffect(() => {
    if (step !== "scanned") return;
    const t = setTimeout(() => {
      if (joining && pendingInvite) {
        login("tata", "mobywatel", familyProfile, { joinFamily: true });
        setInvite({ ...pendingInvite, joinedAt: pendingInvite.joinedAt ?? new Date().toISOString() });
        setWho("partner z zaproszenia");
      } else if (mode === "register" && account === "mama") setWho(registerMama());
      else setWho(loginFamily(account));
      setStep("done");
    }, 1200);
    return () => clearTimeout(t);
  }, [step, joining, pendingInvite, mode, account, login, familyProfile, setInvite, registerMama, loginFamily]);

  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => {
      onOpenChange(false);
      toast.success(joining ? "Dołączono do konta rodziny" : mode === "register" ? "Konto założone – uzupełnij dane dziecka" : `Zalogowano: ${who}`);
      router.replace(joining || mode === "register" ? "/start" : "/panel");
    }, mode === "register" || joining ? 2200 : 1100);
    return () => clearTimeout(t);
  }, [step, joining, mode, who, onOpenChange, router]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={mode === "register" ? "Rejestracja przez mObywatel" : "Logowanie przez mObywatel"} description="Symulacja – w środowisku produkcyjnym: login.gov.pl / Węzeł Krajowy.">
      <AnimatePresence mode="wait">
        {step !== "done" ? (
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
              <li className="flex gap-2"><Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-[#d4213d]" /> Potwierdź {mode === "register" ? "rejestrację" : "logowanie"} w telefonie.</li>
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
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-3">
              <Fingerprint className="h-6 w-6 shrink-0 text-brand" />
              <div>
                <div className="text-[16px] font-bold text-brand">Tożsamość potwierdzona</div>
                <div className="text-[15px] text-fg-2">{joining ? "Dołączasz do konta rodziny" : who}</div>
              </div>
            </div>
            {(mode === "register" || joining) && (
              <div>
                <div className="mb-2 text-[14px] font-bold text-fg-2">Pobieramy dane z mObywatela i ZUS:</div>
                <ul className="space-y-1.5">
                  {FETCHED.map((x, i) => (
                    <motion.li key={x} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.25 }} className="flex items-center gap-2 text-[15px] text-fg-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" /> {x}
                    </motion.li>
                  ))}
                </ul>
                <p className="mt-3 text-[14px] text-muted">Dane dziecka (termin porodu, płeć, imię) uzupełnisz w następnym kroku.</p>
              </div>
            )}
            {mode === "login" && !joining && (
              <p className="flex items-center gap-2 text-[15px] text-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> Otwieramy Twój pulpit…
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}
