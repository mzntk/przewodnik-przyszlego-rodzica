"use client";
/** Strażnik logowania i uprawnień działa w AppShell – ten komponent zostaje jako przezroczysty wrapper. */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
