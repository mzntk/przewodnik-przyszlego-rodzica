"use client";
import { Check, Copy, Link2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, NumberInput, Select } from "@/components/ui/form";
import { emptyCase, buildIncomeHistory } from "@/data/profiles";
import { TITLE_LABELS, type InsuranceTitle } from "@/models/types";

const TITLES = (Object.keys(TITLE_LABELS) as InsuranceTitle[]).map((t) => ({ value: t, label: TITLE_LABELS[t] }));

function inviteCode() {
  const part = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZP-${part()}-${part()}`;
}

/** Zaproszenie partnera: kod i link. Logując się z linku, partner ma od razu wybraną rolę „Tata / Partner”. */
export function InviteBox() {
  const [code, setCode] = useState<string | null>(null);
  if (!code)
    return (
      <Button variant="secondary" className="w-full" onClick={() => setCode(inviteCode())}>
        <Link2 className="h-4 w-4" /> Wygeneruj zaproszenie dla partnera
      </Button>
    );
  const link = `${window.location.origin}/?zaproszenie=${code}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <code className="num flex-1 truncate rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] font-bold tracking-wider">{code}</code>
        <Button size="sm" variant="secondary" onClick={() => (navigator.clipboard?.writeText(link), toast.success("Skopiowano link zaproszenia"))} aria-label="Kopiuj link zaproszenia">
          <Copy className="h-4 w-4" /> Kopiuj link
        </Button>
      </div>
      <p className="text-[14px] text-muted">Partner otwiera link, loguje się przez mObywatel jako „Tata / Partner” i widzi tylko to, co mu udostępnisz.</p>
    </div>
  );
}

export function AddPartnerSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data, setData } = useApp();
  const [first, setFirst] = useState("");
  const [title, setTitle] = useState<InsuranceTitle>("uop");
  const [count, setCount] = useState(50);
  const [salary, setSalary] = useState(7000);
  const added = !!data.father;

  function save() {
    setData((d) => {
      const base = emptyCase().mother;
      d.father = { ...base, role: "ojciec", firstName: first.trim() || "Partner", lastName: d.mother.lastName, title, voluntarySickness: title !== "uop", payer: { name: "", nip: "", insuredCount: count }, incomeHistory: buildIncomeHistory(new Date().toISOString().slice(0, 7), 12, salary) };
      if (d.plan.fatherParentalWeeks === 0) d.plan.fatherParentalWeeks = 9;
      d.plan.paternity.enabled = true;
      return d;
    });
    toast.success("Dodano partnera");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={added ? "Zaproś partnera" : "Dodaj partnera"} description="Partner dostanie własne konto. Ty decydujesz, które sekcje widzi.">
      {!added ? (
        <div className="space-y-4">
          <Field label="Imię partnera" htmlFor="p-first">
            <Input id="p-first" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="np. Piotr" />
          </Field>
          <Field label="Rodzaj zatrudnienia" htmlFor="p-title">
            <Select id="p-title" value={title} onChange={setTitle} options={TITLES} />
          </Field>
          {title === "uop" && (
            <Field label="Ile osób zatrudnia jego pracodawca" hint="Decyduje, czy jego zasiłek wypłaci pracodawca, czy ZUS" htmlFor="p-count">
              <NumberInput id="p-count" value={count} min={1} onChange={setCount} suffix="os." />
            </Field>
          )}
          <Field label="Wynagrodzenie brutto (średnio)" htmlFor="p-salary">
            <NumberInput id="p-salary" value={salary} step={100} onChange={setSalary} suffix="zł" />
          </Field>
          <Button className="w-full" onClick={save}>
            <Check className="h-4 w-4" /> Dodaj partnera
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[16px] text-fg-2">
            {data.father?.firstName} jest dodany do Waszej rodziny. Policzyliśmy jego urlop ojcowski i 9 tygodni rodzicielskiego.
          </p>
          <InviteBox />
          <Link href="/ustawienia#partner" onClick={() => onOpenChange(false)} className="block text-[15px] font-bold text-brand hover:underline">
            Ustaw, co widzi partner →
          </Link>
        </div>
      )}
    </Sheet>
  );
}
