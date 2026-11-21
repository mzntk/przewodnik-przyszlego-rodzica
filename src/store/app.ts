"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CaseInput } from "@/models/types";
import { TEST_PROFILES, emptyCase } from "@/data/profiles";
import type { CaseState } from "@/models/case-status";

export type CaseData = Omit<CaseInput, "asOf">;
export type Account = "mama" | "tata" | "admin";

export interface AppNotification {
  id: string;
  kind: "termin" | "status" | "system";
  title: string;
  body: string;
  at: string;
  read: boolean;
  caseId?: string;
  href?: string;
}

export interface HealthLog {
  date: string;
  weight?: number;
  bpSys?: number;
  bpDia?: number;
  symptoms?: string;
}

export interface DayLog {
  mood?: number; // 1–5
  tags: string[];
  note?: string;
  weight?: number;
}

export interface Appointment {
  id: string;
  date: string;
  title: string;
}

/** Co Mama udostępnia Partnerowi (zarządzane w Ustawieniach → Dostęp dla Partnera). */
export interface PartnerAccess {
  formalities: boolean; // zadania i formalności ZUS/USC
  leave: boolean; // urlop ojcowski i rodzicielski taty
  pregnancy: boolean; // podgląd kalendarza ciąży
  symptoms: boolean; // dziennik objawów i samopoczucia
  lists: boolean; // torba do szpitala i wyprawka
  finances: boolean; // kwoty zasiłków mamy
}

interface AppState {
  loggedIn: boolean;
  account: Account | null;
  loginMethod: "mobywatel" | "manual" | null;
  profileId: string | null;
  data: CaseData;
  onboarded: string[];
  zusFetched: boolean;
  role: "user" | "admin";
  access: PartnerAccess;
  configRev: number;
  checklists: Record<string, boolean>;
  cases: Record<string, CaseState>;
  casesSyncedAt: string | null;
  activeCase: string | null;
  notifications: AppNotification[];
  notify: { inApp: boolean; push: boolean };
  healthLogs: HealthLog[];
  dayLogs: Record<string, DayLog>;
  appointments: Appointment[];
  epds: { date: string; score: number; level: string; flagged: boolean }[];
  contacts: { partner: string; doctor: string };
  login: (account: Account, method: "mobywatel" | "manual", profileId: string | null) => void;
  logout: () => void;
  completeOnboarding: () => void;
  setData: (fn: (d: CaseData) => CaseData) => void;
  setZusFetched: (v: boolean) => void;
  setAccess: (k: keyof PartnerAccess, v: boolean) => void;
  bumpConfig: () => void;
  toggleCheck: (id: string) => void;
  setCases: (c: Record<string, CaseState>, syncedAt: string) => void;
  setCase: (id: string, c: CaseState) => void;
  openCase: (id: string | null) => void;
  pushNotification: (n: Omit<AppNotification, "read" | "at"> & { at?: string }) => boolean;
  markRead: (id?: string) => void;
  setNotify: (k: "inApp" | "push", v: boolean) => void;
  addHealthLog: (l: HealthLog) => void;
  setDayLog: (date: string, fn: (l: DayLog) => DayLog) => void;
  addAppointment: (a: Appointment) => void;
  removeAppointment: (id: string) => void;
  addEpds: (r: AppState["epds"][number]) => void;
  setContacts: (c: AppState["contacts"]) => void;
}

export const profileKey = (id: string | null) => id ?? "manual";

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      loggedIn: false,
      account: null,
      loginMethod: null,
      profileId: null,
      data: structuredClone(TEST_PROFILES[0].input),
      onboarded: [],
      zusFetched: false,
      role: "user",
      access: { formalities: true, leave: true, pregnancy: true, symptoms: false, lists: true, finances: false },
      configRev: 0,
      checklists: {},
      cases: {},
      casesSyncedAt: null,
      activeCase: null,
      notifications: [],
      notify: { inApp: true, push: false },
      healthLogs: [],
      dayLogs: {},
      appointments: [],
      epds: [],
      contacts: { partner: "+48 600 100 200", doctor: "+48 22 555 01 01" },
      login: (account, method, profileId) =>
        set((s) => {
          if (account === "admin") return { loggedIn: true, account, role: "admin", loginMethod: method, profileId: null };
          // Konto partnera powiązane z tą samą rodziną – zachowaj dane wprowadzone przez Mamę na tym urządzeniu.
          const sameFamily = s.profileId === profileId && profileKey(profileId) !== "manual" && s.onboarded.includes(profileKey(profileId));
          const p = TEST_PROFILES.find((x) => x.id === profileId);
          return {
            loggedIn: true,
            account,
            role: "user",
            loginMethod: method,
            profileId,
            data: sameFamily ? s.data : structuredClone(p ? p.input : emptyCase()),
            zusFetched: sameFamily ? s.zusFetched : false,
            cases: sameFamily ? s.cases : {},
            notifications: sameFamily ? s.notifications : [],
          };
        }),
      logout: () => set({ loggedIn: false, account: null, loginMethod: null, role: "user" }),
      completeOnboarding: () => set((s) => ({ onboarded: [...new Set([...s.onboarded, profileKey(s.profileId)])] })),
      setData: (fn) => set((s) => ({ data: fn(structuredClone(s.data)) })),
      setZusFetched: (v) => set({ zusFetched: v }),
      setAccess: (k, v) => set((s) => ({ access: { ...s.access, [k]: v } })),
      bumpConfig: () => set((s) => ({ configRev: s.configRev + 1 })),
      toggleCheck: (id) => set((s) => ({ checklists: { ...s.checklists, [id]: !s.checklists[id] } })),
      setCases: (c, syncedAt) => set((s) => ({ cases: { ...s.cases, ...c }, casesSyncedAt: syncedAt })),
      setCase: (id, c) => set((s) => ({ cases: { ...s.cases, [id]: c } })),
      openCase: (id) => set({ activeCase: id }),
      pushNotification: (n) => {
        const exists = useApp.getState().notifications.some((x) => x.id === n.id);
        if (exists) return false;
        set((s) => ({ notifications: [{ ...n, at: n.at ?? new Date().toISOString(), read: false }, ...s.notifications].slice(0, 40) }));
        return true;
      },
      markRead: (id) => set((s) => ({ notifications: s.notifications.map((x) => (!id || x.id === id ? { ...x, read: true } : x)) })),
      setNotify: (k, v) => set((s) => ({ notify: { ...s.notify, [k]: v } })),
      addHealthLog: (l) => set((s) => ({ healthLogs: [l, ...s.healthLogs].slice(0, 60) })),
      setDayLog: (date, fn) => set((s) => ({ dayLogs: { ...s.dayLogs, [date]: fn(s.dayLogs[date] ?? { tags: [] }) } })),
      addAppointment: (a) => set((s) => ({ appointments: [...s.appointments, a].sort((x, y) => x.date.localeCompare(y.date)) })),
      removeAppointment: (id) => set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
      addEpds: (r) => set((s) => ({ epds: [r, ...s.epds].slice(0, 20) })),
      setContacts: (c) => set({ contacts: c }),
    }),
    { name: "zasilkowy-przewodnik-v3", version: 3, partialize: ({ activeCase: _a, ...rest }) => rest },
  ),
);
