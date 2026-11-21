"use client";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
  outline: "border border-line-strong text-fg hover:bg-surface-2",
  ghost: "text-fg-2 hover:text-fg hover:bg-surface-2",
  danger: "bg-red text-white hover:opacity-90",
  gold: "bg-gold text-white hover:opacity-90",
  success: "bg-brand text-white hover:bg-brand-hover",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[15px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-[17px] rounded-xl gap-2",
  icon: "h-9 w-9 rounded-xl",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "primary", size = "md", ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "inline-flex select-none items-center justify-center font-bold whitespace-nowrap transition-[background,opacity,color] duration-150 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
