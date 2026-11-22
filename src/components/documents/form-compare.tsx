"use client";
import { AlertTriangle, CheckCircle2, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import type { AnalysisResponse } from "@/models/document";
import { OFFICIAL_FIELDS, OFFICIAL_FORMS, blankValue, fieldSource, fillValues, sameFieldValue, tableCells, todayIso, type FieldValue, type OfficialField, type OfficialFormId } from "@/data/official-forms";
import { useApp, type CaseData } from "@/store/app";
import { useCalculation } from "@/hooks/use-calculation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const show = (v: FieldValue | undefined) => (v === true ? "zaznaczone ✕" : blankValue(v) ? "puste" : String(v));

/** Pola, bez których ZUS wezwie do uzupełnienia – sygnalizujemy je, nawet gdy brakuje ich także w aplikacji. */
const REQUIRED_READS = new Set(["pesel", "firstName", "lastName", "street", "house", "postal", "city", "nip", "payerName", "childPesel", "childFirst", "childLast", "childBirth"]);

type Row = { key: string; f: OfficialField; a: FieldValue | undefined; e: FieldValue | undefined };

/** Czyj to druk: PESEL z pola wnioskodawcy porównany z mamą i tatą w aplikacji. */
export function formApplicant(form: OfficialFormId, actual: Record<string, FieldValue>, data: CaseData): { who: "matka" | "ojciec" | null; pesel: string } {
  const peselField = (OFFICIAL_FIELDS[form] ?? []).find((f) => f.read === "pesel");
  const pesel = String((peselField && actual[peselField.name]) || "").replace(/\D/g, "");
  if (!pesel) return { who: "matka", pesel };
  if (pesel === data.mother.pesel) return { who: "matka", pesel };
  if (data.father && pesel === data.father.pesel) return { who: "ojciec", pesel };
  return { who: null, pesel };
}

/**
 * Potok 2: druk wypełniony samodzielnie (albo pobrany z aplikacji i poprawiony) porównujemy pole po polu
 * z drukiem, który aplikacja przygotowałaby z danych rodziny (mObywatel, ZUS, kalkulator) – i mówimy, czego brakuje i skąd to wziąć.
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
  const { who, pesel } = formApplicant(form, actual, data);
  if (!who) {
    return (
      <Card>
        <CardHeader title={`Porównanie druku ${meta.code} z danymi w aplikacji`} icon={<GitCompareArrows className="h-4 w-4" />} action={<Badge tone="orange">inna osoba</Badge>} />
        <CardBody>
          <p className="flex items-start gap-2 text-[15px] text-fg-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
            PESEL na druku ({pesel}) nie należy ani do mamy, ani do taty zapisanych w aplikacji, więc nie porównujemy go z Twoimi danymi. Sprawdź, czy w numerze nie ma literówki.
          </p>
        </CardBody>
      </Card>
    );
  }

  const expected = fillValues(form, { d: data, r: result, who, today: todayIso() });
  const defs = (OFFICIAL_FIELDS[form] ?? []).filter((f) => !f.name.startsWith("@") && f.read !== "signDate" && !f.today);
  const rows: Row[] = defs.map((f) => ({ key: f.name, f, a: actual[f.name], e: expected[f.name] }));
  // tabela wynagrodzeń (Z-3 / Z-3a): kwoty z poszczególnych miesięcy
  const table = (OFFICIAL_FIELDS[form] ?? []).find((f) => f.name.startsWith("@table"));
  if (table) {
    const known = new Set((OFFICIAL_FIELDS[form] ?? []).map((f) => f.name));
    for (const c of tableCells({ ...actual, ...expected }, known).filter((x) => !x.hidden))
      rows.push({ key: c.key, f: { name: c.key, label: c.label.replace(/undefined\/undefined/, "miesiąc"), section: table.section }, a: actual[c.key], e: expected[c.key] });
  }

  const missing = rows.filter((r) => blankValue(r.a) && !blankValue(r.e));
  const differ = rows.filter((r) => !blankValue(r.a) && !blankValue(r.e) && !sameFieldValue(r.f, r.a, r.e));
  // zaznaczenie, którego aplikacja by nie postawiła, to też różnica (np. „Za życiem”, TAK zamiast NIE)
  const extraChecks = rows.filter((r) => r.f.check && r.a === true && !r.e && r.f.fill);
  const extraText = rows.filter((r) => !r.f.check && !blankValue(r.a) && blankValue(r.e) && r.f.fill);
  const bothEmpty = rows.filter((r) => blankValue(r.a) && blankValue(r.e) && r.f.read && REQUIRED_READS.has(r.f.read));
  const problems = missing.length + differ.length + extraChecks.length + bothEmpty.length;
  const checkedCount = rows.filter((r) => !blankValue(r.a) || !blankValue(r.e)).length;

  return (
    <Card>
      <CardHeader
        title={`Porównanie druku ${meta.code} z danymi w aplikacji`}
        subtitle={`Twój druk vs druk, który aplikacja wypełniłaby za ${who === "ojciec" ? "tatę" : "mamę"} (dane z mObywatela, ZUS i kalkulatora)`}
        icon={<GitCompareArrows className="h-4 w-4" />}
        action={<Badge tone={problems ? "orange" : "green"}>{problems ? `${problems} do sprawdzenia` : "zgodny"}</Badge>}
      />
      <CardBody className="space-y-5">
        {problems === 0 && (
          <p className="flex items-center gap-2 text-[15px] text-green">
            <CheckCircle2 className="h-4 w-4" /> Wszystkie {checkedCount} pola zgadzają się z danymi w aplikacji.
          </p>
        )}
        <Group title="Brakuje na druku" tone="orange" note="W aplikacji masz te dane – przepisz je do druku." rows={missing} form={form} />
        <Group title="Inna wartość niż w aplikacji" tone="red" note="Różnica nie zawsze jest błędem (np. inny okres urlopu niż w kalkulatorze) – sprawdź, która wartość jest prawdziwa, i popraw druk albo dane w aplikacji." rows={[...differ, ...extraChecks]} form={form} />
        <Group title="Brakuje na druku i w aplikacji" tone="orange" note="Tych danych nie mamy – uzupełnij je w druku (i w aplikacji, żeby kolejne wnioski wypełniły się same)." rows={bothEmpty} form={form} hideApp />
        {extraText.length > 0 && (
          <p className="text-[13px] text-muted">
            Na druku jest też {extraText.length} {extraText.length === 1 ? "pole" : "pól"}, których nie ma w aplikacji ({extraText.map((r) => r.f.label).slice(0, 4).join(", ")}{extraText.length > 4 ? "…" : ""}) – jeśli są poprawne, możesz je dopisać w Ustawieniach.
          </p>
        )}
        {problems > 0 && <p className="text-[13px] text-muted">Druk wypełniony danymi z aplikacji pobierzesz w Moje sprawy → wybrany wniosek → „Podgląd wniosku”.</p>}
      </CardBody>
    </Card>
  );
}

function Group({ title, tone, note, rows, form, hideApp }: { title: string; tone: "orange" | "red"; note: string; rows: Row[]; form: OfficialFormId; hideApp?: boolean }) {
  if (!rows.length) return null;
  return (
    <section>
      <h4 className={cn("text-[15px] font-bold", tone === "red" ? "text-red" : "text-orange")}>
        {title} <span className="font-normal text-muted">{rows.length}</span>
      </h4>
      <p className="mt-0.5 text-[13px] text-muted">{note}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[14px]">
          <thead>
            <tr className="text-left text-[13px] text-muted">
              <th className="py-1 pr-3 font-medium">Pole druku</th>
              <th className="py-1 pr-3 font-medium">Na Twoim druku</th>
              {!hideApp && <th className="py-1 font-medium">Według aplikacji</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ key, f, a, e }) => (
              <tr key={key} className="align-top">
                <td className="py-1.5 pr-3 text-fg-2">
                  <span className="block text-[12px] text-muted">{f.section}</span>
                  {f.label}
                  <span className="mt-0.5 block text-[12px] text-muted">
                    <b>Skąd:</b> {fieldSource(form, f)}
                  </span>
                </td>
                <td className={cn("py-1.5 pr-3 font-bold", blankValue(a) ? "text-orange" : "text-red")}>{show(a)}</td>
                {!hideApp && <td className="py-1.5 font-bold text-green">{show(e)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
