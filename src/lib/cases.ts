/** Lista spraw urzędowych dotyczących rodziny – wyprowadzana z danych profilu i wyniku silnika. */
import type { CalculationResult, Deadline } from "@/models/types";
import type { CaseData } from "@/store/app";
import { GUIDES, type DocGuide, type DocId, type GuideContext } from "@/data/documents";

export interface CaseItem {
  guide: DocGuide;
  deadline?: Deadline;
  /** Identyfikator formularza do autouzupełnienia i eksportu PDF (components/forms/form-catalog). */
  formId?: string;
}

const FORM_ID: Partial<Record<DocId, string>> = {
  "URLOP-MAC-PRZED": "mat-przed",
  "URLOP-RODZ": "rodzicielski",
  "URLOP-RODZ-TATA": "rodzicielski-tata",
  "URLOP-LACZENIE": "laczenie",
  "URLOP-UZUP": "uzupelniajacy",
  "URLOP-OJC": "ojcowski",
  ZAM: "zam",
  "ZAS-53": "zas53",
  "Z-15A": "z15a",
  "Z-12": "z12",
  "USC-REJESTRACJA": "usc",
};

export function guideContext(d: CaseData, r: CalculationResult): GuideContext {
  return {
    payerIsZus: r.mother.eligibility.payer.payer === "zus",
    employee: d.mother.title === "uop",
    zaZyciem: d.child.zaZyciem,
    supplementary: r.leave.supplementaryWeeks > 0,
    adoption: d.child.path !== "biologiczny",
    combinedVariant: d.plan.variant === "combined",
    fatherInsured: !!r.father?.eligibility.insured,
  };
}

export function listCases(d: CaseData, r: CalculationResult): CaseItem[] {
  const dl = (id: string) => r.deadlines.find((x) => x.id === id);
  const e = r.mother.eligibility;
  const employee = d.mother.title === "uop";
  const jdg = ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(d.mother.title);
  const bio = d.child.path === "biologiczny";
  const born = !!d.child.birthDate;
  const loss = d.child.stillbirth || !!d.child.childDeathDate;
  const ids: [DocId, Deadline | undefined][] = [];
  const add = (id: DocId, deadline?: Deadline) => ids.push([id, deadline]);

  if (e.insured) {
    if (employee) {
      if (bio && !born) add("URLOP-MAC-PRZED", dl("mat-before"));
      if (r.leave.parentalWeeks > 0 && d.plan.motherParentalWeeks > 0) add("URLOP-RODZ", d.plan.variant === "combined" ? dl("combined") : dl("parental-app"));
      if (d.plan.combineWithWork.enabled && d.plan.combineWithWork.who === "matka") add("URLOP-LACZENIE", dl("combine-work"));
      if (r.leave.supplementaryWeeks > 0) add("URLOP-UZUP", dl("parental-app"));
      if (e.payer.payer === "zus") add("Z-3");
    } else {
      add("ZAM", d.plan.variant === "combined" ? dl("combined") : undefined);
      if (d.mother.title === "zlecenie" && e.payer.payer === "zus") add("Z-3a");
      if (jdg && d.mother.sickLeaves.length) add("ZAS-53");
      add("ZUS-ZUA");
    }
  }
  if (d.father && r.father?.eligibility.insured) {
    if (d.plan.paternity.enabled) add("URLOP-OJC", dl("paternity"));
    if (d.plan.fatherParentalWeeks > 0) add("URLOP-RODZ-TATA");
  }
  if (bio && !loss) {
    add("USC-REJESTRACJA", dl("usc"));
    add("NFZ-ZGLOSZENIE", dl("zcna"));
  }
  if (!loss) add("800PLUS", dl("800plus"));
  if (loss) add("Z-12", dl("z12"));
  if (d.care?.enabled) add("Z-15A");

  return ids.map(([id, deadline]) => ({ guide: GUIDES[id], deadline, formId: FORM_ID[id] }));
}
