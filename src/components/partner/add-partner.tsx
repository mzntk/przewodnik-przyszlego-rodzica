"use client";
import { Check, CheckCircle2, ChevronDown, Clock, Copy, Link2, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/form";
import { emptyCase, buildIncomeHistory } from "@/data/profiles";
import { TITLE_LABELS, type InsuranceTitle } from "@/models/types";
import { cn } from "@/lib/utils";

const TITLES = (Object.keys(TITLE_LABELS) as InsuranceTitle[]).map((t) => ({ value: t, label: TITLE_LABELS[t] }));

function inviteCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZP-${part()}-${part()}`;
}

/**
 * Zaproszenie partnera: link z kodem. Partner otwiera go, loguje się WŁASNYM mObywatelem
 * i sam uzupełnia swoje dane (rodzaj umowy, liczbę ubezpieczonych u pracodawcy, zarobki).
 */
export function InviteBox({ partnerName = "" }: { partnerName?: string }) {
  const { invite, setInvite } = useApp();
  if (!invite)
    return (
      <Button className="w-full" onClick={() => setInvite({ code: inviteCode(), partnerName: partnerName.trim(), createdAt: new Date().toISOString() })}>
        <Link2 className="h-4 w-4" /> Utwórz link zaproszenia
      </Button>
    );
  const link = typeof window !== "undefined" ? `${window.location.origin}/?zaproszenie=${invite.code}` : "";
  const share = async () => {
    const text = "Dołącz do naszego konta w Przewodniku Przyszłego Rodzica – zaloguj się przez mObywatel:";
    if (navigator.share) await navigator.share({ title: "Zaproszenie – Przewodnik Przyszłego Rodzica", text, url: link }).catch(() => null);
    else {
      await navigator.clipboard?.writeText(link);
      toast.success("Skopiowano link zaproszenia");
    }
  };
  return (
    <div className="space-y-3">
      <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[14px] font-bold", invite.completedAt ? "bg-brand-soft text-brand" : "bg-gold-soft text-gold")}>
        {invite.completedAt ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        {invite.completedAt ? "Partner dołączył i uzupełnił swoje dane" : invite.joinedAt ? "Partner się zalogował – uzupełnia dane" : "Czeka na dołączenie partnera"}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <code className="num min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-3 py-2.5 text-[14px]">{link}</code>
        <Button size="sm" variant="secondary" className="h-10 shrink-0" onClick={() => (navigator.clipboard?.writeText(link), toast.success("Skopiowano link zaproszenia"))} aria-label="Kopiuj link">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <Button variant="secondary" className="w-full" onClick={share}>
        <Share2 className="h-4 w-4" /> Wyślij link (SMS, komunikator, e-mail)
      </Button>
      <ol className="list-decimal space-y-1 pl-5 text-[14px] text-fg-2">
        <li>Partner otwiera link na swoim telefonie lub komputerze.</li>
        <li>Loguje się <b>własnym mObywatelem</b> (kod QR) jako „Tata / Partner”.</li>
        <li>Sam wpisuje swoje dane – Ty nie musisz ich znać.</li>
      </ol>
      <p className="text-[13px] text-muted">
        Kod: <b className="num">{invite.code}</b> · ważny 7 dni.{" "}
        <button className="font-bold text-brand hover:underline" onClick={() => setInvite({ ...invite, code: inviteCode(), createdAt: new Date().toISOString(), joinedAt: undefined, completedAt: undefined })}>
          Wygeneruj nowy
        </button>
      </p>
    </div>
  );
}

export function AddPartnerSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data, setData, invite } = useApp();
  const [first, setFirst] = useState("");
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState<InsuranceTitle>("uop");
  const [count, setCount] = useState(50);
  const [salary, setSalary] = useState(7000);
  const added = !!data.father || !!invite;

  function ensureFather(withDetails: boolean) {
    setData((d) => {
      const base = emptyCase().mother;
      d.father = {
        ...base,
        role: "ojciec",
        firstName: first.trim() || "Partner",
        lastName: d.mother.lastName,
        ...(withDetails ? { title, voluntarySickness: title !== "uop", payer: { name: "", nip: "", insuredCount: count }, incomeHistory: buildIncomeHistory(new Date().toISOString().slice(0, 7), 12, salary) } : {}),
      };
      if (d.plan.fatherParentalWeeks === 0) d.plan.fatherParentalWeeks = 9;
      d.plan.paternity.enabled = true;
      return d;
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Dodaj partnera" description="Partner dostanie własne konto i zaloguje się swoim mObywatelem. Ty decydujesz, które sekcje widzi.">
      <div className="space-y-5">
        {!added && (
          <Field label="Imię partnera (opcjonalnie)" htmlFor="p-first">
            <Input id="p-first" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="np. Piotr" />
          </Field>
        )}
        <InviteBox partnerName={first} />
        {!data.father && (
          <div className="rounded-xl border border-line">
            <button onClick={() => setManual((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] font-bold text-fg-2" aria-expanded={manual}>
              Partner nie ma mObywatela? Wpiszę jego dane sama
              <ChevronDown className={cn("h-4 w-4 transition-transform", manual && "rotate-180")} />
            </button>
            {manual && (
              <div className="space-y-4 border-t border-line px-4 py-4">
                <Field label="Rodzaj zatrudnienia" htmlFor="p-title">
                  <Select id="p-title" value={title} onChange={setTitle} options={TITLES} />
                </Field>
                {title === "uop" && (
                  <Field label="Ilu ubezpieczonych ma jego pracodawca" hint="Wystarczy „do 20” albo „ponad 20” – zapytaj partnera lub jego kadry." htmlFor="p-count">
                    <NumberInput id="p-count" value={count} min={1} onChange={setCount} suffix="os." />
                  </Field>
                )}
                <Field label="Wynagrodzenie brutto (średnio)" htmlFor="p-salary">
                  <NumberInput id="p-salary" value={salary} step={100} onChange={setSalary} suffix="zł" />
                </Field>
                <Button variant="secondary" className="w-full" onClick={() => (ensureFather(true), toast.success("Dodano dane partnera"))}>
                  <Check className="h-4 w-4" /> Zapisz dane partnera
                </Button>
              </div>
            )}
          </div>
        )}
        {added && (
          <Link href="/ustawienia#partner" onClick={() => onOpenChange(false)} className="block text-[15px] font-bold text-brand hover:underline">
            Ustaw, co widzi partner →
          </Link>
        )}
      </div>
    </Sheet>
  );
}
