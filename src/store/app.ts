"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CaseInput } from "@/models/types";
import { TEST_PROFILES, emptyCase } from "@/data/profiles";
import { completeFromFamily, familyByNo, getFamily, randomFamilyNo } from "@/data/families";
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

export type EventKind = "wizyta" | "badanie" | "usg" | "polozna" | "szkola" | "urzad" | "inne";
export const EVENT_KINDS: Record<EventKind, string> = { wizyta: "Wizyta lekarska", badanie: "Badanie", usg: "USG", polozna: "Położna", szkola: "Szkoła rodzenia", urzad: "Urząd / ZUS", inne: "Inne" };

export interface Appointment {
  id: string;
  date: string;
  title: string;
  time?: string;
  kind?: EventKind;
  place?: string;
  note?: string;
  /** Widoczne dla partnera w jego kalendarzu (wymaga udostępnienia kalendarza ciąży). */
  shared?: boolean;
  author?: "mama" | "tata";
}

/** Rodzaje powiadomień – użytkownik wybiera, co i którym kanałem chce dostawać. */
export const NOTIFY_TOPICS = {
  terminy: { label: "Terminy urzędowe", desc: "14, 7 i 3 dni przed terminem oraz w dniu terminu (wnioski, USC, 800+)" },
  statusy: { label: "Statusy spraw w ZUS", desc: "Rejestracja, weryfikacja, prośba o uzupełnienie, decyzja" },
  wiadomosci: { label: "Odpowiedzi z ZUS", desc: "Nowa wiadomość w skrzynce PUE/eZUS" },
  wizyty: { label: "Wizyty i wydarzenia", desc: "Przypomnienie dzień wcześniej o wizycie, badaniu, szkole rodzenia" },
  ciaza: { label: "Tydzień ciąży", desc: "Raz w tygodniu: co się zmienia i co warto zrobić" },
  ryzyka: { label: "Ryzyka dla świadczeń", desc: "Gdy coś może obniżyć lub zablokować zasiłek (np. zaległość w składkach)" },
} as const;
export type NotifyTopic = keyof typeof NOTIFY_TOPICS;
export type NotifyChannel = "inApp" | "email" | "push";
export type NotifyPrefs = Record<NotifyTopic, Record<NotifyChannel, boolean>>;
const defaultPrefs = (): NotifyPrefs => ({
  terminy: { inApp: true, email: true, push: false },
  statusy: { inApp: true, email: true, push: false },
  wiadomosci: { inApp: true, email: true, push: false },
  wizyty: { inApp: true, email: false, push: false },
  ciaza: { inApp: true, email: false, push: false },
  ryzyka: { inApp: true, email: true, push: false },
});

export interface ZusMessage {
  id: string;
  from: "ja" | "zus";
  text: string;
  at: string;
  topic?: string;
  read: boolean;
}

export interface PartnerInvite {
  code: string;
  partnerName: string;
  createdAt: string;
  joinedAt?: string;
  /** Partner uzupełnił swoje dane po zalogowaniu przez mObywatel. */
  completedAt?: string;
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
  notifyPrefs: NotifyPrefs;
  email: string;
  zusMessages: ZusMessage[];
  invite: PartnerInvite | null;
  aiConsent: boolean;
  /** Tryb testowy: rodzina „przypięta” do tego urządzenia (jak jedna tożsamość w mObywatelu). */
  familyNo: number | null;
  healthLogs: HealthLog[];
  dayLogs: Record<string, DayLog>;
  appointments: Appointment[];
  epds: { date: string; score: number; level: string; flagged: boolean }[];
  contacts: { partner: string; doctor: string };
  login: (account: Account, method: "mobywatel" | "manual", profileId: string | null, opts?: { joinFamily?: boolean }) => void;
  /** Zaloguj się (mObywatel) – zawsze ta sama rodzina na tym urządzeniu. Zwraca nazwę zalogowanej osoby. */
  loginFamily: (account: "mama" | "tata") => string;
  /** Zarejestruj się (mama) – dane osobowe i ubezpieczeniowe z mObywatela i ZUS, dane dziecka wpisywane w kreatorze. */
  registerMama: () => string;
  /** Tryb testowy – wyczyść dane z urządzenia i wylosuj inną rodzinę. */
  drawNewFamily: () => void;
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
  updateAppointment: (a: Appointment) => void;
  setNotifyPref: (t: NotifyTopic, c: NotifyChannel, v: boolean) => void;
  setEmail: (e: string) => void;
  addZusMessage: (m: Omit<ZusMessage, "id" | "at" | "read"> & { at?: string; read?: boolean }) => void;
  readZusMessages: () => void;
  setInvite: (i: PartnerInvite | null) => void;
  setAiConsent: (v: boolean) => void;
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
      notifyPrefs: defaultPrefs(),
      email: "",
      zusMessages: [],
      invite: null,
      aiConsent: true,
      familyNo: null,
      healthLogs: [],
      dayLogs: {},
      appointments: [],
      epds: [],
      contacts: { partner: "+48 600 100 200", doctor: "+48 22 555 01 01" },
      login: (account, method, profileId, opts) =>
        set((s) => {
          if (account === "admin") return { loggedIn: true, account, role: "admin", loginMethod: method, profileId: null };
          // Partner z linku zaproszenia dołącza do rodziny założonej przez mamę (te same dane, także przy koncie ręcznym)
          if (opts?.joinFamily) return { loggedIn: true, account, role: "user", loginMethod: method };
          // Konto partnera powiązane z tą samą rodziną – zachowaj dane wprowadzone przez Mamę na tym urządzeniu.
          const sameFamily = s.profileId === profileId && profileKey(profileId) !== "manual" && s.onboarded.includes(profileKey(profileId));
          const p = getFamily(profileId) ?? TEST_PROFILES.find((x) => x.id === profileId);
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
            zusMessages: sameFamily ? s.zusMessages : [],
            appointments: sameFamily ? s.appointments : [],
            invite: sameFamily ? s.invite : null,
          };
        }),
      loginFamily: (account) => {
        const s = useApp.getState();
        const no = s.familyNo ?? randomFamilyNo();
        const fam = familyByNo(no);
        const known = s.profileId === fam.id && s.onboarded.includes(fam.id);
        set({
          familyNo: no,
          loggedIn: true,
          account,
          role: "user",
          loginMethod: "mobywatel",
          profileId: fam.id,
          onboarded: [...new Set([...s.onboarded, fam.id])],
          // ponowne logowanie: dane i wpisy z urządzenia zostają; pierwsze – pełny profil rodziny z ZUS
          ...(known
            ? { data: completeFromFamily(s.data.father || account === "mama" ? s.data : { ...s.data, father: structuredClone(fam.input.father) }, fam) }
            : { data: structuredClone(fam.input), zusFetched: false, cases: {}, notifications: [], zusMessages: [], appointments: [], dayLogs: {}, invite: null, checklists: {} }),
        });
        const p = account === "tata" ? fam.input.father : fam.input.mother;
        return `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();
      },
      registerMama: () => {
        const s = useApp.getState();
        const no = s.familyNo ?? randomFamilyNo();
        const fam = familyByNo(no);
        const base = emptyCase();
        const due = new Date(Date.now() + 150 * 86_400_000).toISOString().slice(0, 10);
        set({
          familyNo: no,
          loggedIn: true,
          account: "mama",
          role: "user",
          loginMethod: "mobywatel",
          profileId: fam.id,
          // z mObywatela i ZUS: dane osobowe, ubezpieczenie, płatnik, zarobki, e-ZLA; dziecko i partner – uzupełnia rodzic
          data: { ...base, mother: structuredClone(fam.input.mother), child: { path: "biologiczny", dueDate: due, childrenCount: 1, zaZyciem: false, kids: [{ sex: "nie_wiem" }] }, plan: { ...base.plan, fatherParentalWeeks: 0 } },
          onboarded: s.onboarded.filter((x) => x !== fam.id),
          zusFetched: false,
          cases: {},
          notifications: [],
          zusMessages: [],
          appointments: [],
          dayLogs: {},
          invite: null,
          checklists: {},
        });
        return `${fam.input.mother.firstName} ${fam.input.mother.lastName}`;
      },
      drawNewFamily: () =>
        set((s) => ({
          familyNo: randomFamilyNo(s.familyNo ?? undefined),
          loggedIn: false,
          account: null,
          loginMethod: null,
          role: "user",
          profileId: null,
          onboarded: [],
          data: structuredClone(TEST_PROFILES[0].input),
          zusFetched: false,
          cases: {},
          casesSyncedAt: null,
          notifications: [],
          zusMessages: [],
          appointments: [],
          dayLogs: {},
          healthLogs: [],
          epds: [],
          invite: null,
          checklists: {},
        })),
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
      updateAppointment: (a) => set((s) => ({ appointments: s.appointments.map((x) => (x.id === a.id ? a : x)).sort((x, y) => (x.date + (x.time ?? "")).localeCompare(y.date + (y.time ?? ""))) })),
      setNotifyPref: (t, c, v) => set((s) => ({ notifyPrefs: { ...s.notifyPrefs, [t]: { ...s.notifyPrefs[t], [c]: v } } })),
      setEmail: (email) => set({ email }),
      addZusMessage: (m) => set((s) => ({ zusMessages: [...s.zusMessages, { ...m, id: `m${Date.now()}${Math.random().toString(36).slice(2, 5)}`, at: m.at ?? new Date().toISOString(), read: m.read ?? m.from === "ja" }] })),
      readZusMessages: () => set((s) => ({ zusMessages: s.zusMessages.map((m) => ({ ...m, read: true })) })),
      setInvite: (invite) => set({ invite }),
      setAiConsent: (aiConsent) => set({ aiConsent }),
      removeAppointment: (id) => set((s) => ({ appointments: s.appointments.filter((a) => a.id !== id) })),
      addEpds: (r) => set((s) => ({ epds: [r, ...s.epds].slice(0, 20) })),
      setContacts: (c) => set({ contacts: c }),
    }),
    {
      name: "zasilkowy-przewodnik-v3",
      version: 7,
      partialize: ({ activeCase: _a, ...rest }) => rest,
      // v3 → v4: nowe pola (preferencje powiadomień, wiadomości, zaproszenie) – uzupełniamy domyślnymi
      // v5 → v6: adres, rachunek, REGON płatnika, PESEL dzieci – uzupełniane z profilu rodziny (pełne wnioski)
      // v6 → v7: sprawa „Z-15A” → „Z-15” (od 24.10.2026 jeden druk Z-15 zamiast Z-15A i Z-15B)
      migrate: (persisted, version) => {
        const p = { ...(persisted as AppState), ...(version < 4 ? { notifyPrefs: defaultPrefs(), email: "", zusMessages: [], invite: null, aiConsent: true } : {}), ...(version < 5 ? { familyNo: null } : {}) } as AppState;
        if (version < 6 && p.familyNo && p.data) p.data = completeFromFamily(p.data, familyByNo(p.familyNo));
        if (version < 7) {
          if (p.cases?.["Z-15A"]) {
            const { "Z-15A": z15, ...rest } = p.cases;
            p.cases = { ...rest, "Z-15": rest["Z-15"] ?? z15 };
          }
          p.notifications = (p.notifications ?? []).map((n) => (n.caseId === "Z-15A" ? { ...n, caseId: "Z-15" } : n));
        }
        return p;
      },
    },
  ),
);
