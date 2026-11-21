"use client";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster theme="light" position="top-right" closeButton visibleToasts={3} duration={2500} toastOptions={{ style: { fontFamily: "Lato, Helvetica, sans-serif", borderRadius: 12, fontSize: 14 } }} />
    </>
  );
}
