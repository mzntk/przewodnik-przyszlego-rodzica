"use client";
import { useEffect, useState } from "react";
import { create } from "zustand";
import type { CalculationResult } from "@/models/types";
import { useApp, type CaseData } from "@/store/app";

interface CalcState {
  key: string | null;
  result: CalculationResult | null;
  loading: boolean;
  error: string | null;
}
const useCalcStore = create<CalcState>(() => ({ key: null, result: null, loading: false, error: null }));
let inflight: { key: string; ctrl: AbortController } | null = null;

async function runCalculation(input: CaseData): Promise<CalculationResult> {
  const res = await fetch("/api/calculate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, asOf: new Date().toISOString().slice(0, 10) }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Błąd obliczeń");
  return json;
}

/**
 * Wynik deterministycznego silnika (REST /api/calculate) dla danych z profilu – jedno wspólne zapytanie dla całej aplikacji.
 * Z `override` liczy osobny scenariusz (np. porównanie wariantów) bez wpływu na wynik współdzielony.
 */
export function useCalculation(override?: CaseData) {
  const data = useApp((s) => s.data);
  const rev = useApp((s) => s.configRev);
  const shared = useCalcStore();
  const [local, setLocal] = useState<{ key: string; result: CalculationResult } | null>(null);
  const input = override ?? data;
  const key = `${rev}:${JSON.stringify(input)}`;

  useEffect(() => {
    if (override) {
      const ctrl = new AbortController();
      const t = setTimeout(() => runCalculation(override).then((result) => !ctrl.signal.aborted && setLocal({ key, result })).catch(() => {}), 180);
      return () => (clearTimeout(t), ctrl.abort());
    }
    const t = setTimeout(async () => {
      const s = useCalcStore.getState();
      if ((s.key === key && s.result) || inflight?.key === key) return;
      inflight?.ctrl.abort();
      const ctrl = new AbortController();
      inflight = { key, ctrl };
      useCalcStore.setState({ loading: true });
      try {
        const result = await runCalculation(input);
        if (!ctrl.signal.aborted) useCalcStore.setState({ key, result, loading: false, error: null });
      } catch (e) {
        if (!ctrl.signal.aborted) useCalcStore.setState({ loading: false, error: (e as Error).message });
      } finally {
        if (inflight?.key === key) inflight = null;
      }
    }, 180);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (override) return { result: local?.result ?? null, loading: local?.key !== key, error: null };
  return { result: shared.result, loading: shared.loading || shared.key !== key, error: shared.error };
}
