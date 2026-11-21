import { Baby, Calculator, CalendarHeart, FileSearch, FileSignature, Home, LifeBuoy, ListTodo, MapPinned, Settings2, ShieldCheck, Wallet } from "lucide-react";
import type { Account, PartnerAccess } from "@/store/app";

export interface NavItem {
  href: string;
  label: string;
  short: string;
  icon: typeof Home;
}
export interface NavGroup {
  title: string;
  items: NavItem[];
}

const I = {
  pulpit: { href: "/panel", label: "Start", short: "Start", icon: Home },
  ciaza: { href: "/ciaza", label: "Moja ciąża", short: "Ciąża", icon: CalendarHeart },
  swiadczenia: { href: "/swiadczenia", label: "Ile i kiedy dostanę", short: "Pieniądze", icon: Wallet },
  kalkulator: { href: "/kalkulator", label: "Policz zasiłek", short: "Policz", icon: Calculator },
  wnioski: { href: "/wnioski", label: "Moje sprawy", short: "Sprawy", icon: FileSignature },
  dokumenty: { href: "/dokumenty", label: "Sprawdź dokument", short: "Sprawdź", icon: FileSearch },
  partner: { href: "/partner", label: "Moje sprawy i urlop", short: "Sprawy", icon: ListTodo },
  wsparcie: { href: "/wsparcie", label: "Pomoc i telefony", short: "Pomoc", icon: LifeBuoy },
  placowki: { href: "/placowki", label: "Gdzie to załatwić", short: "Mapa", icon: MapPinned },
  ustawienia: { href: "/ustawienia", label: "Ustawienia", short: "Ustawienia", icon: Settings2 },
  admin: { href: "/admin", label: "Parametry legislacyjne", short: "Parametry", icon: ShieldCheck },
} satisfies Record<string, NavItem>;

export function navFor(account: Account | null, access: PartnerAccess): NavGroup[] {
  if (account === "admin")
    return [
      { title: "Administracja ZUS", items: [I.admin] },
      { title: "Narzędzia", items: [I.kalkulator, I.dokumenty] },
    ];
  if (account === "tata")
    return [
      { title: "", items: [I.pulpit, ...(access.formalities || access.leave ? [I.partner] : []), ...(access.finances ? [I.swiadczenia] : [])] },
      { title: "Dziecko", items: [{ ...I.ciaza, label: access.pregnancy ? "Nasza ciąża" : "Przygotowania" }] },
      { title: "Pomoc", items: [I.wsparcie, I.placowki, { ...I.ustawienia, label: "Moje konto" }] },
    ].filter((g) => g.items.length);
  return [
    { title: "", items: [I.pulpit, I.ciaza] },
    { title: "Pieniądze i formalności", items: [I.wnioski, I.swiadczenia, I.kalkulator, I.dokumenty] },
    { title: "Pomoc", items: [I.wsparcie, I.placowki, I.ustawienia] },
  ];
}

export function mobileTabsFor(account: Account | null, access: PartnerAccess): NavItem[] {
  if (account === "admin") return [I.admin, I.kalkulator, I.dokumenty];
  // Ten sam układ dla obu rodziców: Start · Sprawy · Ciąża · Pieniądze.
  // Tata widzi „Pieniądze” tylko, gdy mama udostępni kwoty – wtedy w tym miejscu jest „Pomoc”.
  if (account === "tata") return [I.pulpit, ...(access.formalities || access.leave ? [I.partner] : []), I.ciaza, access.finances ? I.swiadczenia : I.wsparcie];
  return [I.pulpit, I.wnioski, I.ciaza, I.swiadczenia];
}

/** Czy dane konto ma dostęp do ścieżki (strażnik ról i uprawnień partnera). */
export function canAccess(path: string, account: Account | null, access: PartnerAccess): boolean {
  const items = navFor(account, access).flatMap((g) => g.items.map((i) => i.href));
  if (account === "mama" && path.startsWith("/start")) return true;
  return items.some((h) => path === h || path.startsWith(`${h}/`));
}

export const BRAND_ICON = Baby;

/**
 * Spójna logika przycisków: link do sekcji niedostępnej dla danego konta zamieniamy na jej odpowiednik
 * (np. „Moje sprawy” mamy → „Moje sprawy i urlop” taty), zamiast prowadzić na ekran „brak dostępu”.
 */
export function resolveHref(href: string, account: Account | null, access: PartnerAccess): string {
  const path = href.split(/[?#]/)[0];
  if (canAccess(path, account, access)) return href;
  if (account === "tata") {
    if (path === "/wnioski" || path === "/kalkulator") return access.formalities || access.leave ? `/partner${path === "/kalkulator" ? "#urlop" : ""}` : "/panel";
    if (path === "/swiadczenia" || path === "/dokumenty") return "/panel";
  }
  return navFor(account, access)[0]?.items[0]?.href ?? "/panel";
}
