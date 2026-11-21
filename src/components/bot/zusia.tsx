"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ZUSia – biało-zielona bocianica, maskotka i asystentka aplikacji.
 * Pliki: public/brand/zusia.png (z identyfikatorem), zusia-pakunek.png (z pakunkiem ZUS), zusia-lot.png / .gif (w locie).
 */
export const ZUSIA = {
  badge: "/brand/zusia.png",
  bundle: "/brand/zusia-pakunek.png",
  flying: "/brand/zusia-lot.png",
} as const;

/** Okrągły awatar (kadr na głowę ZUSi) – zawsze 1:1, bez zniekształceń. */
export function ZusiaAvatar({ className }: { className?: string }) {
  return (
    <span className={cn("relative block aspect-square size-9 shrink-0 overflow-hidden rounded-full border border-line bg-white", className)}>
      <Image src={ZUSIA.badge} alt="" width={640} height={640} className="absolute inset-0 h-full w-full scale-[2.1] object-contain [object-position:50%_22%]" style={{ transformOrigin: "50% 18%" }} />
    </span>
  );
}

/** ZUSia z dymkiem – np. na ekranie logowania. */
export function ZusiaSays({ children, variant = "badge", className, imgClassName }: { children: React.ReactNode; variant?: keyof typeof ZUSIA; className?: string; imgClassName?: string }) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <motion.div initial={{ opacity: 0, y: 10, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 16 }} className="shrink-0">
        <Image src={ZUSIA[variant]} alt="ZUSia – bocianica, asystentka aplikacji" width={640} height={640} priority className={cn("aspect-square size-24 object-contain sm:size-28", imgClassName)} />
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.9, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.25, type: "spring", stiffness: 260, damping: 22 }} className="relative mb-6 min-w-0 flex-1 rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 text-[15px] leading-snug text-fg-2 shadow-card">
        {children}
      </motion.div>
    </div>
  );
}
