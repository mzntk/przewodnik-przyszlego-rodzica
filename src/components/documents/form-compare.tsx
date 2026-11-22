"use client";
import { CheckCircle2, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import type { AnalysisResponse } from "@/models/document";
import { OFFICIAL_FIELDS, OFFICIAL_FORMS, fillValues, sameValue, todayIso, type FieldValue } from "@/data/official-forms";
import { useApp } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const show = (v: FieldValue | undefined) => (v === true ? "zaznaczone ✕" : v === false || v === undefined || v === "" ? "puste" : String(v));

/**
 * Potok 2: druk wypełniony samodzielnie porównujemy pole po polu z drukiem, który aplikacja
 * przygotowałaby z danych rodziny (mObywatel, ZUS, kalkulator).
 */
export function FormCompare({ res }: { res: AnalysisResponse }) {
  const { data, loggedIn } = useApp();
  const { result } = useCalculation();
  const form = res.officialForm;
  if (!form || !res.formFields) return null;
  const meta = OFFICIAL_FORMS[form];
  if (!loggedIn || !result) {
    return (
      <Card>
        <CardHeader title={`Porównanie druku ${meta.code} z danymi w aplikacji`} icon={<GitCompareArrows className="h-4 w-4" />} />
        <CardBody>
          <p className="text-[15px] text-fg-2">
            <Link href="/" className="font-bold text-brand underline">Zaloguj się</Link>, a porównamy Twój druk z danymi z mObywatela i ZUS oraz z terminami z kalkulatora.
          </p>
        </CardBody>
      </Card>
    );
  }
  const actual = res.formFields;
  const pesel = String(actual["Page1.PESEL"] ?? actual["Page2.PESEL"] ?? actual["Page1.III01_NrPESEL"] ?? "").replace(/\D/g, "");
  const who = data.father && pesel && pesel === data.father.pesel ? "ojciec" : "matka";
  const expected = fillValues(form, { d: data, r: result, who, today: todayIso() });
  const rows = (OFFICIAL_FIELDS[form] ?? [])
    .filter((f) => f.read !== "signDate")
    .map((f) => ({ f, a: actual[f.name], e: expected[f.name] }))
    .filter(({ a, e }) => (e !== undefined && e !== "" && e !== false) || (a !== undefined && a !== "" && a !== false));
  const diff = rows.filter(({ a, e }) => !sameValue(a, e));
  return (
    <Card>
      <CardHeader
        title={`Porównanie druku ${meta.code} z danymi w aplikacji`}
        subtitle={`Twój druk vs druk, który aplikacja wypełniłaby za ${who === "ojciec" ? "tatę" : "mamę"} (dane z mObywatela, ZUS i kalkulatora)`}
        icon={<GitCompareArrows className="h-4 w-4" />}
        action={<Badge tone={diff.length ? "orange" : "green"}>{diff.length ? `${diff.length} różnic` : "zgodny"}</Badge>}
      />
      <CardBody>
        {diff.length === 0 ? (
          <p className="flex items-center gap-2 text-[15px] text-green">
            <CheckCircle2 className="h-4 w-4" /> Wszystkie {rows.length} pola zgadzają się z danymi w aplikacji.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th className="py-1 pr-3 font-medium">Pole druku</th>
                  <th className="py-1 pr-3 font-medium">Na Twoim druku</th>
                  <th className="py-1 font-medium">Według aplikacji</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {diff.map(({ f, a, e }) => (
                  <tr key={f.name}>
                    <td className="py-1.5 pr-3 text-fg-2">
                      <span className="block text-[12px] text-muted">{f.section}</span>
                      {f.label}
                    </td>
                    <td className={cn("py-1.5 pr-3 font-bold", a === undefined || a === "" || a === false ? "text-orange" : "text-red")}>{show(a)}</td>
                    <td className="py-1.5 font-bold text-green">{show(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[13px] text-muted">Różnica nie zawsze jest błędem (np. inny okres urlopu, niż zaplanowany w kalkulatorze) – sprawdź każde pole. Druk z danymi aplikacji pobierzesz w zakładce Wnioski → wybrany wniosek → „Podgląd wniosku”.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
