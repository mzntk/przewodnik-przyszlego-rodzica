"use client";
import { ArrowRight, Baby, Check, FileCheck2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { useToday } from "@/hooks/use-mounted";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { BirthDetails } from "@/components/forms/case-editors";
import { childLabel, missingBirthData } from "@/lib/child";

/** „Dziecko już jest na świecie” – data porodu, potem dane z aktu urodzenia do automatycznego wypełniania dokumentów. */
export function BirthSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data, setData } = useApp();
  const today = useToday();
  const [date, setDate] = useState("");
  const born = !!data.child.birthDate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={born ? `Dane ${childLabel(data.child, false) === "twoje dziecko" ? "dziecka" : childLabel(data.child)}` : "Dziecko już jest na świecie?"} description="Na tej podstawie wypełnimy za Ciebie dokumenty: rejestrację w USC, zgłoszenie do NFZ (ZCNA), 800+, ZAM i wnioski urlopowe." wide>
      {!born ? (
        <div className="space-y-4">
          <p className="text-[16px] text-fg-2">Gratulacje! 💚 Podaj datę porodu – przeliczymy terminy (rejestracja w USC: 21 dni, wniosek o 81,5%: 21 dni, 800+ z wyrównaniem: 3 miesiące).</p>
          <Field label="Data urodzenia" htmlFor="b-date">
            <Input id="b-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button className="w-full" disabled={!date} onClick={() => (setData((d) => ((d.child.birthDate = date), d)), toast.success("Zapisano datę urodzenia – terminy przeliczone"))}>
            <Check className="h-4 w-4" /> Potwierdź narodziny
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <BirthDetails />
          <Button className="w-full" onClick={() => (onOpenChange(false), toast.success("Zapisano – dane dziecka trafią do wniosków"))}>
            <FileCheck2 className="h-4 w-4" /> Zapisz – wypełnij nimi dokumenty
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** Karta na pulpicie: przed porodem (od ok. 34. tyg.) – „Dziecko już jest na świecie?”, po porodzie – brakujące dane do dokumentów. */
export function BirthPrompt() {
  const { data } = useApp();
  const today = useToday();
  const [open, setOpen] = useState(false);
  const c = data.child;
  if (c.path !== "biologiczny" || today === "1970-01-01") return null;
  const daysToDue = Math.round((Date.parse(c.dueDate) - Date.parse(today)) / 86_400_000);
  const show = c.birthDate ? missingBirthData(c) : daysToDue <= 45;
  if (!show) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-4 rounded-2xl border-2 border-brand bg-brand-soft px-5 py-4 text-left transition hover:brightness-[0.98]">
        <Baby className="h-6 w-6 shrink-0 text-brand" />
        <span className="flex-1">
          <span className="block text-[16px] font-bold">{c.birthDate ? `Uzupełnij dane: ${childLabel(c)}` : `${childLabel(c)} już na świecie?`}</span>
          <span className="block text-[14px] text-fg-2">{c.birthDate ? "Imię, nazwisko i PESEL z aktu urodzenia – wypełnimy nimi dokumenty." : "Podaj datę porodu – przeliczymy terminy i przygotujemy dokumenty."}</span>
        </span>
        <ArrowRight className="h-4 w-4 text-brand" />
      </button>
      <BirthSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
