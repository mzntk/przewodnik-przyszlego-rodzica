/**
 * FORMUŁY SPRAWDZANIA druku ZUS (deterministyczne, bez AI) – wspólne dla:
 *  - podglądu wniosku w aplikacji (potok 1, po ręcznych poprawkach),
 *  - druku wgranego do sprawdzenia (potok 2),
 *  - REST: POST /api/forms/check.
 * Reguły: sumy kontrolne (PESEL, NIP, REGON, NRB, dowód), poprawność dat, kod pocztowy, pola wymagane,
 * wykluczające się zaznaczenia oraz zależności „zaznaczone X ⇒ wypełnij Y”.
 */
import { OFFICIAL_FIELDS, fieldLabel, findConflicts, type FieldValue, type OfficialFormId } from "@/data/official-forms";
import { validateIdCard, validateNip, validateNrb, validatePesel, validateRegon } from "@/services/documents/identifiers";

export interface FormIssue {
  field: string;
  label: string;
  severity: "error" | "warning";
  rule: "suma-kontrolna" | "data" | "format" | "wymagane" | "wykluczajace" | "zaleznosc";
  message: string;
}

export interface FormCheck {
  form: OfficialFormId;
  ok: boolean;
  errors: FormIssue[];
  warnings: FormIssue[];
  /** liczba sprawdzonych reguł – do raportu */
  checked: number;
}

/** Zaznaczenie pola A wymaga wypełnienia pola B (albo zaznaczenia pola nadrzędnego). */
const REQUIRES: Partial<Record<OfficialFormId, { when: string; then: string; message: string; severity?: "error" | "warning" }[]>> = {
  ZAM: [
    { when: "Page2.macierzynskiego", then: "Page2.Okres", message: "Zaznaczono urlop macierzyński – podaj okres (od–do)" },
    { when: "Page2.nawarunkach", then: "Page2.Okres", message: "Zaznaczono urlop na warunkach macierzyńskiego – podaj okres (od–do)" },
    { when: "Page2.rodzicielskiego", then: "Page2.Okres2", message: "Zaznaczono urlop rodzicielski – podaj okres (od–do)" },
    { when: "Page2.rodzicielskiego", then: "Page2.czesc", message: "Podaj, która to część urlopu rodzicielskiego", severity: "warning" },
    { when: "Page2.uzMacierzynskiego", then: "Page2.Okres3", message: "Zaznaczono uzupełniający urlop macierzyński – podaj okres" },
    { when: "Page2.ojcowskiego", then: "Page2.Okres4", message: "Zaznaczono urlop ojcowski – podaj okres (od–do)" },
    { when: "Page2.ZaznaczX1b", then: "Page2.Data", message: "Przysposobienie – podaj datę przyjęcia dziecka na wychowanie" },
    { when: "Page2.ZaznaczX1c", then: "Page2.Data", message: "Rodzina zastępcza – podaj datę przyjęcia dziecka na wychowanie" },
    { when: "Page2.ZaznaczX1a", then: "Page3.Tekst1", message: "Urodzenie dziecka – podaj dane dziecka (imię, nazwisko, data i miejsce urodzenia)" },
    { when: "Page3._2", then: "Page3.Data2a", message: "Zaznaczono przewidywaną datę porodu – wpisz tę datę" },
    { when: "Page3.ZaznaczX1", then: "Page3.podajimie1", message: "Oświadczenie „Za życiem” – podaj imię dziecka", severity: "warning" },
    { when: "Page3.upadlosc", then: "Page3._3", message: "Zaznaczono przyczynę ustania zatrudnienia bez zaznaczenia punktu 3" },
    { when: "Page3.likwidacje", then: "Page3._3", message: "Zaznaczono przyczynę ustania zatrudnienia bez zaznaczenia punktu 3" },
    { when: "Page3.rozwiazal", then: "Page3._3", message: "Zaznaczono przyczynę ustania zatrudnienia bez zaznaczenia punktu 3" },
    { when: "Page3.zmarl", then: "Page3._3", message: "Zaznaczono przyczynę ustania zatrudnienia bez zaznaczenia punktu 3" },
    { when: "Page3._4", then: "Page3.Tekst4a", message: "Urlop uzupełniający – podaj okres pobytu dziecka w szpitalu" },
    { when: "Page5.TAK", then: "Page5.Okres", message: "Drugi rodzic skorzysta z urlopu – podaj okres" },
    { when: "Page5.TAK2", then: "Page5.Okres1", message: "Zaznaczono TAK w oświadczeniu o urlopie ojcowskim – podaj tytuł i okres" },
  ],
  "ZAS-53": [
    { when: "Page2.wniosek1B", then: "Page2.Data", message: "Niezdolność po ustaniu ubezpieczenia – podaj datę ustania tytułu" },
    { when: "Page2.TAK_5", then: "Page2.Tekst5", message: "Choroba zawodowa / wypadek – podaj dokument potwierdzający" },
  ],
  "Z-3": [{ when: "Page2._3", then: "Page2.Tekstzm", message: "Zasiłek macierzyński – podaj okres" }, { when: "Page4.TAK_7", then: "Page4.Tekst7", message: "Praca w czasie urlopu rodzicielskiego – podaj okres i wymiar" }],
  "Z-3a": [{ when: "Page2._3", then: "Page2.Tekstzm", message: "Zasiłek macierzyński – podaj okres" }, { when: "Page3.Informacje3TAK", then: "Page3.Data3", message: "Tytuł ubezpieczenia ustał – podaj datę ustania" }],
  "Z-12": [{ when: "Page4.Narachunek", then: "Page4.Numerrachunku", message: "Wypłata na rachunek – podaj numer rachunku" }],
};

const empty = (v: FieldValue | undefined) => v === undefined || v === "" || v === false;
const isDate8 = (s: string) => {
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(s.replace(/\D/g, ""));
  if (!m) return false;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1;
};

export function checkForm(form: OfficialFormId, values: Record<string, FieldValue>, opts: { requireFields?: boolean } = {}): FormCheck {
  const issues: FormIssue[] = [];
  let checked = 0;
  const push = (field: string, severity: FormIssue["severity"], rule: FormIssue["rule"], message: string) => issues.push({ field, label: fieldLabel(form, field), severity, rule, message });

  for (const f of OFFICIAL_FIELDS[form] ?? []) {
    if (f.check || f.name.startsWith("@")) continue;
    const v = typeof values[f.name] === "string" ? (values[f.name] as string).trim() : "";
    const digits = v.replace(/\D/g, "");
    checked++;
    if (!v) {
      if (opts.requireFields && ["pesel", "firstName", "lastName", "nip", "payerName"].includes(f.read ?? "")) push(f.name, "error", "wymagane", `Brak wymaganego pola: ${f.label}`);
      continue;
    }
    if (f.read === "pesel" || f.read === "childPesel" || /PESEL/.test(f.name)) {
      const r = validatePesel(digits);
      if (!r.valid) push(f.name, "error", "suma-kontrolna", `${f.label}: ${r.error}`);
    } else if (f.read === "nip" || /NIP/.test(f.name)) {
      const r = validateNip(digits);
      if (!r.valid) push(f.name, "error", "suma-kontrolna", `${f.label}: ${r.error}`);
    } else if (f.read === "regon" || /REGON/.test(f.name)) {
      const r = validateRegon(digits);
      if (!r.valid) push(f.name, "error", "suma-kontrolna", `${f.label}: ${r.error}`);
    } else if (f.read === "bank" || /Numerrachunku/.test(f.name)) {
      const r = validateNrb(digits);
      if (!r.valid) push(f.name, "error", "suma-kontrolna", `${f.label}: ${r.error}`);
    } else if (/Rodzajseriainumerdokumentu|SeriaNrDok/.test(f.name) && /^[A-Z]{3}\s?\d{6}$/i.test(v)) {
      const r = validateIdCard(v);
      if (!r.valid) push(f.name, "error", "suma-kontrolna", `${f.label}: ${r.error}`);
    } else if (/(^|\.)Data|DataUr|DataPowstania|DataWypelnienia|Data\d|Data$/.test(f.name) && !/Dataimiejsce|AktualnaData/.test(f.name)) {
      if (!isDate8(v)) push(f.name, "error", "data", `${f.label}: data musi mieć postać dd/mm/rrrr i istnieć w kalendarzu`);
    } else if (f.read === "postal" && !/^\d{2}-?\d{3}$/.test(v)) {
      push(f.name, "error", "format", `${f.label}: kod pocztowy ma postać 00-000`);
    } else if (/Okres/.test(f.name) && /\d{2}\.\d{2}\.\d{4}.*\d{2}\.\d{2}\.\d{4}/.test(v)) {
      const d = [...v.matchAll(/(\d{2})\.(\d{2})\.(\d{4})/g)].map((m) => `${m[3]}-${m[2]}-${m[1]}`);
      if (d[0] > d[1]) push(f.name, "error", "data", `${f.label}: data „od” jest późniejsza niż „do”`);
    }
  }

  for (const c of findConflicts(form, values)) {
    checked++;
    push(c.checked[0], "error", "wykluczajace", `Wykluczające się zaznaczenia – ${c.label}: ${c.checked.map((k) => `„${fieldLabel(form, k)}”`).join(" i ")}. Zostaw jedno.`);
  }
  for (const r of REQUIRES[form] ?? []) {
    checked++;
    if (values[r.when] === true && empty(values[r.then])) push(r.then, r.severity ?? "error", "zaleznosc", r.message);
  }

  const errors = issues.filter((i) => i.severity === "error");
  return { form, ok: errors.length === 0, errors, warnings: issues.filter((i) => i.severity === "warning"), checked };
}
