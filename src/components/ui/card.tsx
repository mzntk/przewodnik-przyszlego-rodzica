import { cn } from "@/lib/utils";

export function Card({ className, children, as: As = "div", ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "section" | "article" }) {
  return (
    <As className={cn("rounded-2xl border border-line bg-surface", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, icon, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-fg-2">{icon}</div>}
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold tracking-tight text-fg">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[15px] leading-relaxed text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-5 pb-5 pt-4 sm:px-6 sm:pb-6", className)}>{children}</div>;
}
