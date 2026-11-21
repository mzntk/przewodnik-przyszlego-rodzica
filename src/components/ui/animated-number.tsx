"use client";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, value, { type: "spring", stiffness: 140, damping: 26, mass: 0.8 });
    return c.stop;
  }, [value, mv]);
  return <motion.span className={className}>{text}</motion.span>;
}
