"use client";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster theme="light" position="top-right" closeButton toastOptions={{ style: { fontFamily: "Lato, Helvetica, sans-serif", borderRadius: 12, fontSize: 14 } }} />
    </>
  );
}
