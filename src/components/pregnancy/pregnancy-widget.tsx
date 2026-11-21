"use client";
import { ArrowRight, Baby, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Ring } from "@/components/ui/misc";
import { pregnancyWeek, weekInfo } from "@/data/pregnancy";
import { useApp } from "@/store/app";
import { useToday } from "@/hooks/use-mounted";
import { dLong, plural } from "@/lib/utils";
import { childNames } from "@/lib/child";

export function PregnancyWidget({ compact }: { compact?: boolean }) {
  const { data } = useApp();
  const today = useToday();
  if (today === "1970-01-01") return <div className="h-48 animate-pulse rounded-2xl bg-surface" />;
  const c = data.child;
  const event = c.birthDate ?? c.dueDate;
  const week = c.path === "biologiczny" ? pregnancyWeek(c.dueDate, today, c.birthDate) : null;
  const born = c.path === "biologiczny" && week === null;
  const days = Math.round((Date.parse(event) - Date.parse(today)) / 86400000);
  const info = weekInfo(week);
  const trimester = week === null ? null : week <= 13 ? "I trymestr" : week <= 27 ? "II trymestr" : "III trymestr";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="relative flex items-center gap-5">
        <div className="relative shrink-0">
          <Ring value={week ? week / 40 : 1} size={88} stroke={7} color="var(--gold)" />
          <div className="absolute inset-0 grid place-items-center text-center">
            {week ? (
              <div>
                <div className="num text-[24px] leading-none font-semibold">{week}</div>
                <div className="text-[12px] text-muted">tydzień</div>
              </div>
            ) : (
              <Baby className="h-7 w-7 text-gold" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-muted">{born ? `${childNames(c) ?? "Dziecko"} ${c.childrenCount > 1 ? "są" : "jest"} z Wami` : c.path === "biologiczny" ? `${childNames(c) ? `${childNames(c)} – do porodu` : "Do porodu"} · ${trimester}` : `Do przyjęcia${childNames(c) ? `: ${childNames(c)}` : " dziecka"}`}</div>
          <div className="num text-[30px] leading-tight font-semibold tracking-tight">
            {Math.abs(days)} {plural(Math.abs(days), "dzień", "dni", "dni")}
            {born && <span className="text-[17px] font-medium text-muted"> razem</span>}
          </div>
          <div className="text-[14px] text-fg-2">{born ? `urodzone ${dLong(event)}` : `termin: ${dLong(event)}`}</div>
        </div>
      </div>
      {c.path === "biologiczny" && (
        <div className="relative mt-5 rounded-xl bg-surface-2 px-4 py-3">
          <div className="text-[13px] font-semibold text-gold">{info.stage}</div>
          <p className="mt-1 text-[15px] leading-relaxed text-fg-2">{info.feel}</p>
          {!compact && <p className="mt-2 flex gap-2 text-[14px] text-muted"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {info.tip}</p>}
        </div>
      )}
      <Link href="/ciaza" className="relative mt-4 inline-flex items-center gap-1 text-[14px] font-bold text-brand hover:underline">
        Otwórz kalendarz ciąży <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
