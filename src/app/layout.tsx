import type { Metadata, Viewport } from "next";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/lato/900.css";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Zasiłkowy Przewodnik Przyszłego Rodzica · ZUS 2026",
  description: "Uprawnienia, kalkulator zasiłków, terminy i bezbłędne wnioski dla przyszłych rodziców, rodziców adopcyjnych i rodzin zastępczych.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
