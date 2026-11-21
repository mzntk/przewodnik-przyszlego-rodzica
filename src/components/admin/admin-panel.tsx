"use client";
import { motion } from "framer-motion";
import { History, RotateCcw, Save, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ConfigFieldMeta, LegalConfig } from "@/models/legal-config";
import { calculate } from "@/services/engine";
import { TEST_PROFILES } from "@/data/profiles";
import { useApp } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, LegalChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/misc";
import { NumberInput } from "@/components/ui/form";
import { cn, todayISO, zl0 } from "@/lib/utils";

function getPath(o: unknown, p: string): number {
  return p.split(".").reduce<unknown>((x, k) => (x as Record<string, unknown>)?.[k], o) as number;
}
function setPath(o: LegalConfig, p: string, v: number): LegalConfig {
  const c = structuredClone(o) as unknown as Record<string, unknown>;
  const ks = p.split(".");
  let t = c;
  for (const k of ks.slice(0, -1)) t = t[k] as Record<string, unknown>;
  t[ks.at(-1)!] = v;
  return c as unknown as LegalConfig;
}

export function AdminPanel() {
  const mounted = useMounted();
  const { bumpConfig } = useApp();
  const [cfg, setCfg] = useState<LegalConfig | null>(null);
  const [draft, setDraft] = useState<LegalConfig | null>(null);
  const [fields, setFields] = useState<ConfigFieldMeta[]>([]);
  const [history, setHistory] = useState<{ at: string; path: string; from: unknown; to: unknown }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [c, h] = await Promise.all([fetch("/api/config").then((r) => r.json()), fetch("/api/config/history").then((r) => r.json())]);
    setCfg(c.config);
    setDraft(c.config);
    setFields(c.fields);
    setHistory(h.history);
  }, []);
  useEffect(() => {
    // pobranie konfiguracji z REST API przy montowaniu
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const dirty = useMemo(() => (cfg && draft ? fields.filter((f) => getPath(cfg, f.path) !== getPath(draft, f.path)) : []), [cfg, draft, fields]);

  const preview = useMemo(() => {
    if (!cfg || !draft) return [];
    const asOf = todayISO();
    return TEST_PROFILES.slice(0, 4).map((p) => {
      const a = calculate({ ...p.input, asOf }, cfg);
      const b = calculate({ ...p.input, asOf }, draft);
      const pick = (r: typeof a) => (r.mother.eligibility.insured ? r.totals.family : (r.familyBenefits.find((x) => x.id === "kosiniakowe")?.total ?? 0));
      return { id: p.id, name: p.title, before: pick(a), after: pick(b), mBefore: a.totals.monthlyMotherFirst, mAfter: b.totals.monthlyMotherFirst, blocked: b.mother.eligibility.debtBlock.blocked };
    });
  }, [cfg, draft]);

  if (!mounted) return <Skeleton className="h-96" />;
  if (!cfg || !draft) return <Skeleton className="h-96" />;

  async function save() {
    setSaving(true);
    const patch = Object.fromEntries(dirty.map((f) => [f.path, getPath(draft, f.path)]));
    const r = await fetch("/api/config", { method: "PATCH", headers: { "content-type": "application/json", "x-role": "admin" }, body: JSON.stringify(patch) });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) return toast.error(j.error);
    bumpConfig();
    toast.success(`Zapisano ${dirty.length} parametr(ów)`, { description: "Kalkulator przelicza świadczenia według nowych wartości." });
    load();
  }
  async function reset() {
    await fetch("/api/config/reset", { method: "POST", headers: { "x-role": "admin" } });
    bumpConfig();
    toast.success("Przywrócono wartości ustawowe na 2026 r.");
    load();
  }

  const groups = [...new Set(fields.map((f) => f.group))];

  return (
    <div className="space-y-6">
      <PageHeader
       
        title="Konfiguracja legislacyjna"
        description="Zmiana stawek, kwot i wymiarów bez wdrażania kodu. Każda zmiana działa natychmiast w silniku obliczeniowym i jest zapisywana w historii."
        actions={
          <>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Wartości 2026
            </Button>
            <Button onClick={save} disabled={!dirty.length || saving}>
              <Save className="h-4 w-4" /> Zapisz {dirty.length ? `(${dirty.length})` : ""}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-[14px] text-muted">
        <Badge tone="blue">wersja {cfg.version}</Badge> aktualizacja: {new Date(cfg.updatedAt).toLocaleString("pl-PL")}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g}>
              <CardHeader title={g} icon={<Settings2 className="h-4 w-4" />} />
              <CardBody className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                {fields
                  .filter((f) => f.group === g)
                  .map((f) => {
                    const v = getPath(draft, f.path);
                    const changed = getPath(cfg, f.path) !== v;
                    const isPct = f.unit === "%";
                    return (
                      <div key={f.path} className={cn("rounded-xl border p-3 transition", changed ? "border-gold/50 bg-gold-soft" : "border-line")}>
                        <div className="flex items-start justify-between gap-2">
                          <label htmlFor={`cfg-${f.path}`} className="text-[14px] font-medium leading-snug">{f.label}</label>
                          {changed && <Badge tone="gold">zmiana</Badge>}
                        </div>
                        <NumberInput id={`cfg-${f.path}`} className="mt-2" value={isPct ? Math.round(v * 10000) / 100 : v} step={isPct ? 0.5 : f.unit === "zł" ? 1 : 1} suffix={f.unit} onChange={(n) => setDraft(setPath(draft, f.path, isPct ? n / 100 : n))} />
                        <LegalChip className="mt-2">{f.legal}</LegalChip>
                      </div>
                    );
                  })}
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="order-first space-y-4 xl:order-none xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader title="Wpływ zmian – podgląd na żywo" subtitle="Ten sam deterministyczny silnik, profile testowe" icon={<TrendingUp className="h-4 w-4" />} />
            <CardBody className="space-y-2">
              {preview.map((p) => {
                const diff = p.after - p.before;
                return (
                  <motion.div layout key={p.id} className="rounded-xl border border-line px-3.5 py-3">
                    <div className="text-[14px] font-medium">{p.name}</div>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="num text-[18px] font-semibold">{zl0(p.after)}</span>
                      {Math.abs(diff) >= 1 ? (
                        <span className={cn("num inline-flex items-center gap-1 text-[13px] font-semibold", diff > 0 ? "text-green" : "text-red")}>
                          {diff > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                          {diff > 0 ? "+" : ""}
                          {zl0(diff)}
                        </span>
                      ) : (
                        <span className="text-[13px] text-muted">bez zmian</span>
                      )}
                    </div>
                    <div className="text-[13px] text-muted">
                      1. miesiąc: {zl0(p.mBefore)} → {zl0(p.mAfter)}
                      {p.blocked && " · blokada art. 2a"}
                    </div>
                  </motion.div>
                );
              })}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Historia zmian" icon={<History className="h-4 w-4" />} />
            <CardBody className="space-y-1.5">
              {history.length === 0 && <p className="text-[14px] text-muted">Brak zmian w tej sesji serwera.</p>}
              {history.slice(0, 12).map((h, i) => (
                <div key={i} className="rounded-xl bg-surface-2 px-3 py-2 text-[13px]">
                  <div className="font-mono text-[13px] text-muted">{new Date(h.at).toLocaleString("pl-PL")}</div>
                  <div>
                    <b>{fields.find((f) => f.path === h.path)?.label ?? h.path}</b>: {String(h.from)} → {String(h.to)}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
