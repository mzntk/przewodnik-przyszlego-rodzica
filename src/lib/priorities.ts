/** „Na teraz”: najpilniejsze sprawy wyprowadzone z wyniku silnika i statusów spraw z ZUS. */
import type { CalculationResult } from "@/models/types";
import type { CaseState } from "@/models/case-status";
import type { DocId } from "@/data/documents";
import type { CaseData } from "@/store/app";

export interface Priority {
  id: string;
  kind: "alert" | "zaswiadczenie" | "termin";
  title: string;
  sub: string;
  date?: string;
  daysLeft?: number;
  caseId?: DocId;
  href: string;
  tone: "red" | "orange" | "gold" | "blue" | "green";
}

const DEADLINE_CASE: Record<string, (employee: boolean) => DocId> = {
  "mat-before": (e) => (e ? "URLOP-MAC-PRZED" : "ZAM"),
  usc: () => "USC-REJESTRACJA",
  zcna: () => "NFZ-ZGLOSZENIE",
  combined: (e) => (e ? "URLOP-RODZ" : "ZAM"),
  "parental-app": () => "URLOP-RODZ",
  "combine-work": () => "URLOP-LACZENIE",
  "800plus": () => "800PLUS",
  paternity: () => "URLOP-OJC",
  "paternity-app": () => "URLOP-OJC",
  z12: () => "Z-12",
};

const OPEN = new Set(["niezlozony", "uzupelnienie"]);

export function buildPriorities(d: CaseData, r: CalculationResult, today: string, cases: Record<string, CaseState>, caseIds: DocId[], forDad = false): Priority[] {
  const out: Priority[] = [];
  const employee = d.mother.title === "uop";
  const e = r.mother.eligibility;
  const mine = new Set(caseIds);
  const isOpen = (id?: DocId) => !id || !mine.has(id) || OPEN.has(cases[id]?.status ?? "niezlozony");
  const linked = (id: DocId) => (mine.has(id) ? id : undefined);
  const diff = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 86400000);

  if (!forDad) {
    for (const f of r.findings.filter((x) => x.severity === "danger" && x.id !== "ezla-work")) {
      out.push({ id: `f-${f.id}`, kind: "alert", title: f.title, sub: f.message.split(". ")[0] + ".", href: f.action?.href ?? "/swiadczenia", tone: "red" });
    }
    for (const [id, c] of Object.entries(cases)) {
      if (c.status === "uzupelnienie" && mine.has(id as DocId)) out.push({ id: `u-${id}`, kind: "alert", title: "Sprawa wymaga uzupełnienia", sub: c.note ?? "ZUS prosi o uzupełnienie wniosku.", caseId: id as DocId, href: "/wnioski", tone: "red" });
    }
    if (e.debtBlock.blocked) out.push({ id: "z-zus", kind: "zaswiadczenie", title: "Spłać zaległość w składkach", sub: "Bez tego ZUS wstrzyma wypłatę zasiłków.", date: e.debtBlock.expiresOn, href: "/ustawienia#zus", tone: "red" });
    if (d.child.path === "biologiczny" && !d.child.birthDate && e.insured && employee && isOpen("URLOP-MAC-PRZED")) {
      out.push({ id: "z-lek", kind: "zaswiadczenie", title: "Zaświadczenie o przewidywanej dacie porodu", sub: "Poproś lekarza – potrzebne do urlopu przed porodem.", date: r.deadlines.find((x) => x.id === "mat-before")?.windowStart, caseId: linked("URLOP-MAC-PRZED"), href: "/wnioski", tone: "blue" });
    }
    if (r.leave.supplementaryWeeks > 0 && isOpen("URLOP-UZUP")) out.push({ id: "z-szpital", kind: "zaswiadczenie", title: "Zaświadczenie ze szpitala o pobycie dziecka", sub: `Daje ${r.leave.supplementaryWeeks} tyg. dodatkowego urlopu.`, caseId: linked("URLOP-UZUP"), href: "/wnioski", tone: "gold" });
  }

  for (const x of r.deadlines) {
    if (x.daysLeft < 0) continue;
    if (forDad && x.who === "matka") continue;
    const caseId = DEADLINE_CASE[x.id]?.(employee);
    if (caseId && mine.has(caseId) && !isOpen(caseId)) continue;
    out.push({
      id: `d-${x.id}`,
      kind: "termin",
      title: x.title,
      sub: x.description.split(". ")[0] + ".",
      date: x.date,
      daysLeft: x.daysLeft,
      caseId: caseId && mine.has(caseId) ? caseId : undefined,
      href: "/wnioski",
      tone: x.daysLeft <= 14 ? "orange" : x.severity === "danger" ? "red" : x.severity === "gold" ? "gold" : "blue",
    });
  }

  for (const p of out) if (p.date && p.daysLeft === undefined && diff(p.date) >= 0) p.daysLeft = diff(p.date);
  const rank = (p: Priority) => (p.kind === "alert" ? -1e6 : (p.daysLeft ?? 500));
  return out.sort((a, b) => rank(a) - rank(b));
}
