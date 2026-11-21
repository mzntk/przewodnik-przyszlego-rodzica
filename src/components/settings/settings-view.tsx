"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Baby, Bell, BellRing, Check, Database, KeyRound, LogOut, RotateCcw, Shield, UserPlus, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApp, type PartnerAccess } from "@/store/app";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/form";
import { MotionTabs } from "@/components/ui/tabs";
import { ChildEditor, ParentEditor } from "@/components/forms/case-editors";
import { ZusFetch } from "@/components/onboarding/zus-fetch";
import { AddPartnerSheet, InviteBox } from "@/components/partner/add-partner";
import { cn } from "@/lib/utils";

export const ACCESS_ITEMS: { key: keyof PartnerAccess; label: string; desc: string }[] = [
  { key: "formalities", label: "Zadania i formalności ZUS/USC", desc: "Rejestracja w USC, zgłoszenie do NFZ, odpisy, 800+" },
  { key: "leave", label: "Urlop ojcowski i rodzicielski taty", desc: "Terminy, plan 9 niezbywalnych tygodni i jego zasiłki" },
  { key: "pregnancy", label: "Kalendarz ciąży", desc: "Tydzień ciąży, termin porodu, zaplanowane wizyty" },
  { key: "symptoms", label: "Objawy i samopoczucie", desc: "Twój dziennik – domyślnie prywatny" },
  { key: "lists", label: "Torba do szpitala i wyprawka", desc: "Wspólne listy zakupów i pakowania" },
  { key: "finances", label: "Moje zasiłki i kwoty", desc: "Plan świadczeń mamy i wysokość zasiłków" },
];

type Tab = "profil" | "zus" | "partner" | "powiadomienia" | "konto";
const TABS: Tab[] = ["profil", "zus", "partner", "powiadomienia", "konto"];

export function SettingsView() {
  const { account } = useApp();
  return account === "tata" ? <DadAccount /> : <MamaSettings />;
}

function MamaSettings() {
  const router = useRouter();
  const { data, setData, access, setAccess, logout, loginMethod } = useApp();
  const [tab, setTab] = useState<Tab>(() => {
    const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    return TABS.find((t) => t === h) ?? "profil";
  });
  const [addPartner, setAddPartner] = useState(false);
  const shared = ACCESS_ITEMS.filter((a) => access[a.key]).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Ustawienia" description="Twoje dane zasilają kalkulator, terminy i kalendarz. Tu decydujesz też, co widzi partner po zalogowaniu." />
      <MotionTabs
        layoutId="settings-tab"
        value={tab}
        onChange={(t) => (setTab(t), history.replaceState(null, "", `#${t}`))}
        tabs={[
          { id: "profil", label: "Mój profil", icon: <UserRound className="h-4 w-4" /> },
          { id: "zus", label: "Dane z ZUS", icon: <Database className="h-4 w-4" /> },
          { id: "partner", label: "Partner", icon: <Users className="h-4 w-4" /> },
          { id: "powiadomienia", label: "Powiadomienia", icon: <Bell className="h-4 w-4" /> },
          { id: "konto", label: "Konto", icon: <KeyRound className="h-4 w-4" /> },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="space-y-4">
          {tab === "profil" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader title="Dziecko" subtitle="Termin porodu lub przyjęcia" icon={<Baby className="h-4 w-4" />} />
                <CardBody>
                  <ChildEditor />
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Moja sytuacja ubezpieczeniowa" icon={<UserRound className="h-4 w-4" />} />
                <CardBody>
                  <ParentEditor who="mother" />
                </CardBody>
              </Card>
            </div>
          )}
          {tab === "zus" && (loginMethod === "manual" ? <Card><CardBody className="pt-6 text-[15px] text-muted">Konto utworzone ręcznie – dane nie są pobierane z PUE/eZUS.</CardBody></Card> : <ZusFetch />)}
          {tab === "partner" &&
            (data.father ? (
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                <Card>
                  <CardHeader title="Co widzi partner" subtitle={`Partner widzi ${shared} z ${ACCESS_ITEMS.length} sekcji. Zmiany działają od razu.`} icon={<Shield className="h-4 w-4" />} />
                  <CardBody className="space-y-1">
                    {ACCESS_ITEMS.map((a) => (
                      <div key={a.key} className="px-1 py-2.5">
                        <Switch id={`acc-${a.key}`} checked={access[a.key]} onCheckedChange={(v) => setAccess(a.key, v)} label={a.label} description={a.desc} />
                      </div>
                    ))}
                    <div className="border-t border-line pt-4">
                      <InviteBox />
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title={`Dane partnera – ${data.father.firstName}`} icon={<Users className="h-4 w-4" />} />
                  <CardBody className="space-y-4">
                    <ParentEditor who="father" />
                    <Button variant="ghost" size="sm" onClick={() => setData((d) => (delete d.father, d))}>
                      Usuń partnera
                    </Button>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <Card>
                <CardBody className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center">
                  <UserPlus className="h-6 w-6 shrink-0 text-brand" />
                  <div className="flex-1">
                    <div className="text-[17px] font-bold">Nie dodano jeszcze partnera</div>
                    <p className="text-[15px] text-fg-2">Dodaj go w dowolnym momencie – policzymy jego urlop, a Ty zdecydujesz, co zobaczy na swoim koncie.</p>
                  </div>
                  <Button onClick={() => setAddPartner(true)}>
                    <UserPlus className="h-4 w-4" /> Dodaj partnera
                  </Button>
                </CardBody>
              </Card>
            ))}
          {tab === "powiadomienia" && <NotificationSettings />}
          {tab === "konto" && (
            <Card>
              <CardBody className="space-y-3 pt-6">
                <Button variant="secondary" onClick={() => router.push("/start")}>
                  <RotateCcw className="h-4 w-4" /> Uruchom ponownie kreator profilu
                </Button>
                <Button variant="outline" onClick={() => (logout(), router.replace("/"))}>
                  <LogOut className="h-4 w-4" /> Wyloguj się
                </Button>
                <p className="text-[13px] text-muted">Dane przechowywane są lokalnie na tym urządzeniu (wersja demonstracyjna).</p>
              </CardBody>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
      <AddPartnerSheet open={addPartner} onOpenChange={setAddPartner} />
    </div>
  );
}

function NotificationSettings() {
  const { notify, setNotify, pushNotification } = useApp();
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");

  async function togglePush(v: boolean) {
    if (!v) return setNotify("push", false);
    if (!supported) return toast.error("Ta przeglądarka nie obsługuje powiadomień systemowych.");
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      setNotify("push", true);
      toast.success("Powiadomienia push włączone");
    } else toast.error("Przeglądarka zablokowała powiadomienia – zmień to w ustawieniach witryny.");
  }

  function test() {
    const n = { id: `test-${Date.now()}`, kind: "system" as const, title: "Powiadomienie testowe", body: "Tak będą wyglądać przypomnienia o terminach i zmianach statusu spraw." };
    pushNotification(n);
    if (notify.inApp) toast(n.title, { description: n.body });
    if (notify.push && permission === "granted") new Notification(n.title, { body: n.body, icon: "/logo-zus.png" });
  }

  return (
    <Card>
      <CardHeader title="Powiadomienia" subtitle="Przypominamy 14, 7 i 3 dni przed terminem oraz w dniu terminu, a także o każdej zmianie statusu sprawy w ZUS." icon={<Bell className="h-4 w-4" />} />
      <CardBody className="space-y-5">
        <Switch id="n-inapp" checked={notify.inApp} onCheckedChange={(v) => setNotify("inApp", v)} label="Powiadomienia w aplikacji" description="Wyskakujące okienko w rogu ekranu i lista pod dzwonkiem." />
        <Switch id="n-push" checked={notify.push && permission === "granted"} onCheckedChange={togglePush} label="Powiadomienia push w przeglądarce" description={permission === "denied" ? "Zablokowane w przeglądarce – zmień uprawnienia witryny, aby je włączyć." : "Systemowe powiadomienia także wtedy, gdy karta jest w tle."} />
        <Button variant="secondary" onClick={test}>
          <BellRing className="h-4 w-4" /> Wyślij powiadomienie testowe
        </Button>
      </CardBody>
    </Card>
  );
}

function DadAccount() {
  const router = useRouter();
  const { data, access, logout } = useApp();
  return (
    <div className="space-y-6">
      <PageHeader title="Moje konto" description={`Konto partnera powiązane z ${data.mother.firstName} ${data.mother.lastName}.`} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Moje dane ubezpieczeniowe" subtitle="Wpływają na Twój urlop ojcowski i rodzicielski" icon={<UserRound className="h-4 w-4" />} />
          <CardBody>{data.father ? <ParentEditor who="father" /> : null}</CardBody>
        </Card>
        <Card>
          <CardHeader title="Co udostępnia mi mama" subtitle="Ustawienia zmienia mama w swoim profilu" icon={<Shield className="h-4 w-4" />} />
          <CardBody className="space-y-2">
            {ACCESS_ITEMS.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
                <span className={cn("text-[15px]", !access[a.key] && "text-muted")}>{a.label}</span>
                {access[a.key] ? <Badge tone="green"><Check className="h-3 w-3" /> widzę</Badge> : <Badge>ukryte</Badge>}
              </div>
            ))}
            <Button variant="outline" className="mt-3 w-full" onClick={() => (logout(), router.replace("/"))}>
              <LogOut className="h-4 w-4" /> Wyloguj się
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
