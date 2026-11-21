"use client";
import { Legalized } from "./badge";
import { Switch as RSwitch, Slider as RSlider } from "radix-ui";
import { cn } from "@/lib/utils";
import { InfoTip } from "./info-tip";

/** Pole formularza. `info` – ikonka ⓘ z wyjaśnieniem, np. skąd wziąć daną liczbę. */
export function Field({ label, hint, children, className, htmlFor, info }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string; htmlFor?: string; info?: { title: string; body: React.ReactNode } }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex items-center gap-1.5">
        <label htmlFor={htmlFor} className="text-[14px] font-medium text-fg-2">
          {label}
        </label>
        {info && <InfoTip title={info.title}>{info.body}</InfoTip>}
      </span>
      {children}
      {hint && <p className="text-[13px] leading-snug text-muted"><Legalized>{hint}</Legalized></p>}
    </div>
  );
}

const inputCls = "h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm text-fg outline-none transition placeholder:text-muted focus:border-line-strong focus:bg-surface-3";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function NumberInput({ value, onChange, suffix, step = 1, min, max, className, id }: { value: number | undefined; onChange: (v: number) => void; suffix?: string; step?: number; min?: number; max?: number; className?: string; id?: string }) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ""}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={cn(inputCls, "num", suffix && "pr-12")}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
    </div>
  );
}

export function Select<T extends string>({ value, onChange, options, id, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; id?: string; className?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(inputCls, "appearance-none bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-9", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Switch({ checked, onCheckedChange, label, description, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; label?: React.ReactNode; description?: React.ReactNode; id?: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-medium text-fg">{label}</span>}
          {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted"><Legalized>{description}</Legalized></span>}
        </span>
      )}
      <RSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-surface-3 transition-colors data-[state=checked]:bg-brand"
      >
        <RSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=checked]:translate-x-[18px]" />
      </RSwitch.Root>
    </label>
  );
}

export function Slider({ value, onChange, min, max, step = 1, className, tone = "green" }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; className?: string; tone?: "blue" | "gold" | "green" }) {
  const color = tone === "gold" ? "bg-gold" : tone === "green" ? "bg-green" : "bg-blue";
  return (
    <RSlider.Root value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className={cn("relative flex h-6 w-full touch-none items-center select-none", className)}>
      <RSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
        <RSlider.Range className={cn("absolute h-full rounded-full", color)} />
      </RSlider.Track>
      <RSlider.Thumb aria-label="Wartość" className="block h-5 w-5 rounded-full border-2 border-white bg-fg shadow-lg transition-transform hover:scale-110 focus:scale-110 focus:outline-none" />
    </RSlider.Root>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-xl border border-line bg-surface-2 p-1", className)}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn("relative flex-1 rounded-lg px-3 py-1.5 text-[15px] font-medium transition-colors", value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg-2")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
