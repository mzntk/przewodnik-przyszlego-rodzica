import { Legalized } from "./badge";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import type { Severity } from "@/models/types";
import { cn } from "@/lib/utils";

export const severityTone = { info: "blue", success: "green", warning: "orange", danger: "red", gold: "gold" } as const;

export function SeverityIcon({ s, className }: { s: Severity; className?: string }) {
  const cls = cn("h-4 w-4", className);
  if (s === "danger") return <ShieldAlert className={cn(cls, "text-red")} />;
  if (s === "warning") return <AlertTriangle className={cn(cls, "text-orange")} />;
  if (s === "success") return <CheckCircle2 className={cn(cls, "text-green")} />;
  if (s === "gold") return <Sparkles className={cn(cls, "text-gold")} />;
  return <Info className={cn(cls, "text-blue")} />;
}

export function Stat({ label, value, sub, tone, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: "blue" | "green" | "orange" | "gold" | "red"; className?: string }) {
  const t = tone ? { blue: "text-blue", green: "text-green", orange: "text-orange", gold: "text-gold", red: "text-red" }[tone] : "text-fg";
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={cn("num mt-1 truncate text-[21px] font-semibold tracking-tight sm:text-[24px]", t)}>{value}</div>
      {sub && <div className="mt-0.5 text-[13px] text-muted"><Legalized>{sub}</Legalized></div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight sm:text-[32px]">{title}</h1>
        {description && <p className="mt-2 text-[16px] leading-relaxed text-fg-2"><Legalized>{description}</Legalized></p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Ring({ value, size = 56, stroke = 5, className, color = "var(--green)" }: { value: number; size?: number; stroke?: number; className?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className={className} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .8s cubic-bezier(.16,1,.3,1)" }} />
    </svg>
  );
}
