"use client";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true po hydratacji (dane z localStorage dostępne). */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

const SERVER_DATE = "1970-01-01";
/** Dzisiejsza data (RRRR-MM-DD). Na serwerze (prerender) stała wartość – bez odczytu zegara w renderze. */
export function useToday() {
  return useSyncExternalStore(noop, () => new Date().toISOString().slice(0, 10), () => SERVER_DATE);
}
