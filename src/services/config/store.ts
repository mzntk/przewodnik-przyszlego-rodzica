/**
 * Magazyn konfiguracji legislacyjnej (server-side).
 * Persystencja w pliku JSON (.data/legal-config.json); przy braku zapisu (np. read-only FS
 * w chmurze) – w pamięci procesu. W produkcji: tabela PostgreSQL z historią wersji.
 */
import "server-only";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { DEFAULT_LEGAL_CONFIG_2026, type LegalConfig } from "@/models/legal-config";

// Na Vercel system plików jest tylko do odczytu (poza katalogiem tymczasowym) – konfiguracja żyje w /tmp danej instancji.
const FILE = process.env.VERCEL ? path.join(os.tmpdir(), "zasilkowy-przewodnik", "legal-config.json") : path.join(process.cwd(), ".data", "legal-config.json");
let cache: LegalConfig | null = null;
const history: { at: string; path: string; from: unknown; to: unknown }[] = [];

export async function getConfig(): Promise<LegalConfig> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    cache = deepMerge(structuredClone(DEFAULT_LEGAL_CONFIG_2026), JSON.parse(raw)) as LegalConfig;
  } catch {
    cache = structuredClone(DEFAULT_LEGAL_CONFIG_2026);
  }
  return cache;
}

export async function updateConfig(patch: Record<string, number>): Promise<LegalConfig> {
  const cfg = structuredClone(await getConfig());
  for (const [p, value] of Object.entries(patch)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Nieprawidłowa wartość dla ${p}`);
    const from = getPath(cfg, p);
    if (from === undefined) throw new Error(`Nieznany parametr: ${p}`);
    setPath(cfg as unknown as Record<string, unknown>, p, value);
    history.unshift({ at: new Date().toISOString(), path: p, from, to: value });
  }
  cfg.updatedAt = new Date().toISOString();
  cfg.version = `${cfg.year}.${Date.now().toString(36)}`;
  cache = cfg;
  await persist(cfg);
  return cfg;
}

export async function resetConfig(): Promise<LegalConfig> {
  cache = structuredClone(DEFAULT_LEGAL_CONFIG_2026);
  history.unshift({ at: new Date().toISOString(), path: "*", from: "custom", to: "default-2026" });
  await persist(cache);
  return cache;
}

export function getHistory() {
  return history.slice(0, 50);
}

async function persist(cfg: LegalConfig) {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(cfg, null, 2));
  } catch {
    /* read-only FS – konfiguracja w pamięci */
  }
}

export function getPath(obj: unknown, p: string): unknown {
  return p.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function setPath(obj: Record<string, unknown>, p: string, value: unknown) {
  const keys = p.split(".");
  let o: Record<string, unknown> = obj;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys.at(-1)!] = value;
}

function deepMerge(target: Record<string, unknown> | unknown, src: unknown): unknown {
  if (Array.isArray(src)) return src;
  if (src && typeof src === "object" && target && typeof target === "object") {
    const out = { ...(target as Record<string, unknown>) };
    for (const [k, v] of Object.entries(src)) out[k] = deepMerge(out[k], v);
    return out;
  }
  return src ?? target;
}
