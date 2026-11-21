/**
 * SYMULACJE integracji (wymaganie konkursowe – tylko symulacja):
 * mObywatel (logowanie), PUE/eZUS (dane o ubezpieczeniu, wiadomości), zaświadczenie o niezaleganiu,
 * e-ZLA, USC (odpis aktu urodzenia) oraz tracker statusu spraw z estymacją czasu rozpatrywania.
 */
import type { LegalConfig } from "@/models/legal-config";
import { TITLE_LABELS } from "@/models/types";
import { TEST_PROFILES } from "@/data/profiles";
import { round2, addDays } from "@/services/engine/dates";
import { sicknessInsuranceStatus } from "@/services/engine/eligibility";

export function simulateZusFetch(profileId: string, cfg: LegalConfig) {
  const p = TEST_PROFILES.find((x) => x.id === profileId);
  if (!p) return null;
  const m = p.input.mother;
  const status = sicknessInsuranceStatus(m);
  const threshold = round2(cfg.minWage * cfg.debtThresholdRate);
  const debt = m.contributionDebt ?? 0;
  return {
    profileId,
    fetchedAt: new Date().toISOString(),
    person: { firstName: m.firstName, lastName: m.lastName, pesel: m.pesel },
    insurance: {
      title: m.title,
      titleLabel: TITLE_LABELS[m.title],
      sicknessInsured: status.insured,
      statusLabel: status.label,
      since: m.insuranceStart,
      voluntary: m.voluntarySickness,
      payer: m.payer ?? null,
      contributions12m: m.incomeHistory.slice(-12).map((x) => ({ month: x.month, base: x.gross })),
    },
    debtCertificate: ["jdg", "jdg_preferencyjna", "maly_zus_plus"].includes(m.title)
      ? {
          number: `ZUS/ZAŚ/${new Date().getFullYear()}/${m.pesel.slice(-5)}`,
          asOf: m.debtCheckDate ?? new Date().toISOString().slice(0, 10),
          debt,
          threshold,
          blocked: debt > threshold,
          text: debt > threshold ? `Stwierdza się zaległość z tytułu składek w kwocie ${debt.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł.` : "Nie stwierdza się zaległości z tytułu składek na ubezpieczenia społeczne.",
        }
      : null,
    ezla: m.sickLeaves.map((l, i) => ({
      series: `ZX ${String(1048821 + i * 7311).padStart(7, "0")}`,
      from: l.from,
      to: l.to,
      codeB: l.codeB,
      issuer: l.issuer ?? "lekarz",
      diagnosisCode: l.diagnosis ?? "—",
      status: "przekazane do płatnika",
    })),
    messages: p.ezusMessages ?? [],
  };
}

/** Estymacja czasu rozpatrywania – prosty, jawny model (średnie dni robocze wg druku i płatnika). */
const BASE_DAYS: Record<string, number> = { ZAM: 18, "Z-3": 14, "Z-3a": 16, "ZAS-12": 10, "ZAS-53": 21, "Z-15A": 12, "Z-15B": 12, "Z-12": 25, WNIOSEK: 7, USC: 3 };
export function estimateProcessing(form: string, payer: "zus" | "pracodawca", complete: boolean) {
  const base = BASE_DAYS[form] ?? 14;
  const days = Math.round((payer === "pracodawca" ? base * 0.6 : base) * (complete ? 1 : 1.8));
  return { days, range: [Math.max(1, days - 4), days + 6] as [number, number], model: "Średnie historyczne wg druku × płatnik × kompletność (model demonstracyjny)" };
}

export function simulateSubmission(form: string, payer: "zus" | "pracodawca", complete: boolean) {
  const id = `${form.replace(/[^A-Z0-9]/gi, "")}-${Date.now().toString(36).toUpperCase()}`;
  const est = estimateProcessing(form, payer, complete);
  const today = new Date().toISOString().slice(0, 10);
  return { id, form, submittedAt: new Date().toISOString(), channel: payer === "zus" ? "PUE/eZUS" : "Pracodawca (e-mail/kadry)", status: "wyslane" as const, estimate: est, expectedDecision: addDays(today, est.days) };
}
