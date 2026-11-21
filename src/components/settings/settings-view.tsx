"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Baby, Bell, BellRing, Check, Database, Download, KeyRound, LogOut, Mail, MessagesSquare, RotateCcw, Shield, ShieldCheck, Smartphone, Sparkles, Trash2, UserPlus, UserRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NOTIFY_TOPICS, useApp, type NotifyChannel, type NotifyTopic, type PartnerAccess } from "@/store/app";
import { ZusInbox } from "@/components/messages/zus-inbox";
import { TestModeBox } from "@/components/onboarding/test-mode";
import { Field, Input } from "@/components/ui/form";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/form";
import { MotionTabs } from "@/components/ui/tabs";
import { BirthDetails, ChildEditor, ParentEditor } from "@/components/forms/case-editors";
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

type Tab = "profil" | "zus" | "wiadomosci" | "partner" | "powiadomienia" | "konto";
const TABS: Tab[] = ["profil", "zus", "wiadomosci", "partner", "powiadomienia", "konto"];

export function SettingsView() {
  const { account } = useApp();
  return account === "tata" ? <DadAccount /> : <MamaSettings />;
}

function MamaSettings() {
  const { data, setData, access, setAccess, loginMethod, zusMessages, invite, setInvite } = useApp();
  const unread = zusMessages.filter((m) => !m.read).length;
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
          { id: "wiadomosci", label: unread ? `Wiadomości (${unread})` : "Wiadomości z ZUS", icon: <MessagesSquare className="h-4 w-4" /> },
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
                <CardHeader title="Dziecko" subtitle="Termin porodu, płeć i imię – zmienisz je w każdej chwili" icon={<Baby className="h-4 w-4" />} />
                <CardBody>
                  <ChildEditor />
                </CardBody>
              </Card>
              {data.child.birthDate && (
                <Card className="xl:col-span-2">
                  <CardHeader title="Dane z aktu urodzenia" subtitle="Wypełniamy nimi dokumenty: USC, ZCNA, 800+, ZAM i wnioski urlopowe" icon={<Baby className="h-4 w-4" />} />
                  <CardBody>
                    <BirthDetails />
                  </CardBody>
                </Card>
              )}
              <Card>
                <CardHeader title="Moja sytuacja ubezpieczeniowa" icon={<UserRound className="h-4 w-4" />} />
                <CardBody>
                  <ParentEditor who="mother" />
                </CardBody>
              </Card>
            </div>
          )}
          {tab === "zus" && (loginMethod === "manual" ? <Card><CardBody className="pt-6 text-[15px] text-muted">Konto utworzone ręcznie – dane nie są pobierane z PUE/eZUS.</CardBody></Card> : <ZusFetch />)}
          {tab === "wiadomosci" && (
            <Card>
              <CardHeader title="Wiadomości z ZUS" subtitle="Twoja korespondencja z ZUS przez PUE/eZUS" icon={<MessagesSquare className="h-4 w-4" />} />
              <CardBody>
                <ZusInbox />
              </CardBody>
            </Card>
          )}
          {tab === "partner" &&
            (data.father || invite ? (
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
                  <CardHeader title={data.father ? `Dane partnera – ${data.father.firstName}` : "Dane partnera"} subtitle={invite && !invite.completedAt ? "Partner uzupełni je sam po zalogowaniu przez mObywatel" : undefined} icon={<Users className="h-4 w-4" />} />
                  <CardBody className="space-y-4">
                    {data.father ? <ParentEditor who="father" /> : <p className="text-[15px] text-fg-2">Gdy partner dołączy z linku, jego dane pojawią się tutaj.</p>}
                    <Button variant="ghost" size="sm" onClick={() => (setData((d) => (delete d.father, d)), setInvite(null))}>
                      Usuń partnera i zaproszenie
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
          {tab === "konto" && <AccountTab />}
        </motion.div>
      </AnimatePresence>
      <AddPartnerSheet open={addPartner} onOpenChange={setAddPartner} />
    </div>
  );
}

const CHANNELS: { id: NotifyChannel; label: string; icon: typeof Bell }[] = [
  { id: "inApp", label: "W aplikacji", icon: Bell },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "push", label: "Push", icon: Smartphone },
];

function NotificationSettings() {
  const { notify, setNotify, pushNotification, notifyPrefs, setNotifyPref, email, setEmail } = useApp();
  const supported = typeof Notification !== "undefined";
  const [permission, setPermission] = useState(supported ? Notification.permission : "denied");
  const [mail, setMail] = useState(email);
  const pushOn = notify.push && permission === "granted";

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
    if (pushOn) new Notification(n.title, { body: n.body, icon: "/brand/logo-aplikacji.png" });
    if (email) {
      void fetch("/api/notify/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: email, subject: n.title, body: n.body }) });
      toast.success(`Wysłano testowy e-mail na ${email} (symulacja)`);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader title="Co i jak chcesz dostawać" subtitle="Wybierz osobno dla każdego tematu. Możesz wyłączyć wszystko poza tym, co naprawdę ważne." icon={<Bell className="h-4 w-4" />} />
        <CardBody>
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[440px] text-left">
              <thead>
                <tr className="text-[13px] text-muted">
                  <th className="py-2 font-medium">Temat</th>
                  {CHANNELS.map((c) => (
                    <th key={c.id} className="w-20 py-2 text-center font-medium">
                      <c.icon className="mx-auto h-4 w-4" />
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(Object.keys(NOTIFY_TOPICS) as NotifyTopic[]).map((t) => (
                  <tr key={t}>
                    <td className="py-3 pr-3">
                      <div className="text-[15px] font-bold">{NOTIFY_TOPICS[t].label}</div>
                      <div className="text-[13px] text-muted">{NOTIFY_TOPICS[t].desc}</div>
                    </td>
                    {CHANNELS.map((c) => {
                      const disabled = (c.id === "email" && !email) || (c.id === "push" && !pushOn) || (c.id === "inApp" && !notify.inApp);
                      const on = notifyPrefs[t][c.id] && !disabled;
                      return (
                        <td key={c.id} className="py-3 text-center">
                          <input type="checkbox" checked={on} disabled={disabled} onChange={(e) => setNotifyPref(t, c.id, e.target.checked)} aria-label={`${NOTIFY_TOPICS[t].label} – ${c.label}`} className="h-5 w-5 cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-30" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Kanały" icon={<BellRing className="h-4 w-4" />} />
          <CardBody className="space-y-5">
            <Switch id="n-inapp" checked={notify.inApp} onCheckedChange={(v) => setNotify("inApp", v)} label="W aplikacji" description="Krótkie okienko w rogu (znika po ok. 3 s) i lista pod dzwonkiem." />
            <form onSubmit={(e) => (e.preventDefault(), setEmail(mail.trim()), toast.success(mail.trim() ? "Zapisano adres e-mail" : "Wyłączono powiadomienia e-mail"))} className="space-y-2">
              <Field label="E-mail do powiadomień" htmlFor="n-mail" hint="Wersja webowa: przypomnienia wysyłamy e-mailem. Bez kwot i danych o zdrowiu – tylko temat i link.">
                <div className="flex gap-2">
                  <Input id="n-mail" type="email" value={mail} placeholder="np. anna@example.com" onChange={(e) => setMail(e.target.value)} />
                  <Button type="submit" variant="secondary">Zapisz</Button>
                </div>
              </Field>
            </form>
            <Switch id="n-push" checked={pushOn} onCheckedChange={togglePush} label="Push" description={permission === "denied" ? "Zablokowane w przeglądarce – zmień uprawnienia witryny." : "W aplikacji mobilnej – powiadomienia push na telefon. W przeglądarce – powiadomienia systemowe."} />
            <Button variant="secondary" className="w-full" onClick={test}>
              <BellRing className="h-4 w-4" /> Wyślij powiadomienie testowe
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/** Konto: dane logowania, kontakt, prywatność (RODO), eksport i usunięcie danych. */
function AccountTab() {
  const router = useRouter();
  const { data, account, loginMethod, logout, aiConsent, setAiConsent, email, invite, familyNo } = useApp();
  const dad = account === "tata";
  const person = dad ? data.father : data.mother;
  const pesel = person?.pesel ? `${person.pesel.slice(0, 2)}*******${person.pesel.slice(-2)}` : "—";

  function exportData() {
    const raw = localStorage.getItem("zasilkowy-przewodnik-v3") ?? "{}";
    const blob = new Blob([JSON.stringify(JSON.parse(raw), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `moje-dane-przewodnik-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Pobrano kopię Twoich danych (art. 20 RODO)");
  }
  function wipe() {
    if (!confirm("Usunąć wszystkie dane tej aplikacji z tego urządzenia? Tej operacji nie można cofnąć.")) return;
    localStorage.removeItem("zasilkowy-przewodnik-v3");
    logout();
    router.replace("/");
    setTimeout(() => location.reload(), 50);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Moje konto" icon={<UserRound className="h-4 w-4" />} />
        <CardBody>
          <dl className="divide-y divide-line text-[15px]">
            {[
              ["Imię i nazwisko", `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim() || "—"],
              ["Rola", dad ? "Tata / Partner" : "Mama"],
              ["Logowanie", loginMethod === "mobywatel" ? "mObywatel (kod QR) – tożsamość potwierdzona" : "Konto ręczne (bez mObywatela)"],
              ...(familyNo ? [["Rodzina testowa", `nr ${familyNo}`]] : []),
              ["PESEL", pesel],
              ["E-mail do powiadomień", email || "nie podano – ustaw w zakładce Powiadomienia"],
              ...(!dad ? [["Partner", invite?.completedAt ? `${data.father?.firstName ?? "Partner"} – dołączył ${new Date(invite.completedAt).toLocaleDateString("pl-PL")}` : invite ? "zaproszenie wysłane – czeka na dołączenie" : data.father ? "dodany ręcznie" : "nie dodano"]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="text-right font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          <TestModeBox className="mt-4" />
          <div className="mt-4 flex flex-wrap gap-2">
            {!dad && (
              <Button variant="secondary" onClick={() => router.push("/start")}>
                <RotateCcw className="h-4 w-4" /> Kreator profilu od nowa
              </Button>
            )}
            <Button variant="outline" onClick={() => (logout(), router.replace("/"))}>
              <LogOut className="h-4 w-4" /> Wyloguj się
            </Button>
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Prywatność i RODO" subtitle="Twoje dane, Twoje decyzje" icon={<ShieldCheck className="h-4 w-4" />} />
        <CardBody className="space-y-5">
          <Switch
            id="ai-consent"
            checked={aiConsent}
            onCheckedChange={(v) => (setAiConsent(v), toast.success(v ? "Włączono funkcje AI" : "Wyłączono funkcje AI – działa wyłącznie parser regułowy"))}
            label={<span className="inline-flex items-center gap-1.5">Zgoda na wsparcie AI <Sparkles className="h-3.5 w-3.5 text-gold" /></span>}
            description="Analiza dokumentów i odpowiedzi ZUSi. Przed wysłaniem do modelu PESEL, NIP, nr konta, adres i dane kontaktowe są zastępowane tokenami (pseudonimizacja). Obliczenia zawsze robi silnik bez AI."
          />
          <ul className="space-y-1.5 rounded-xl bg-surface-2 p-4 text-[14px] text-fg-2">
            <li>• Dane wersji demonstracyjnej są tylko na tym urządzeniu (pamięć przeglądarki).</li>
            <li>• Dokumenty PDF analizujemy w pamięci serwera – nie zapisujemy ich.</li>
            <li>• Partner widzi wyłącznie sekcje, które mu udostępnisz.</li>
            <li>• Administrator danych: Zakład Ubezpieczeń Społecznych (w wersji produkcyjnej).</li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={exportData}>
              <Download className="h-4 w-4" /> Pobierz moje dane
            </Button>
            <Button variant="danger" onClick={wipe}>
              <Trash2 className="h-4 w-4" /> Usuń dane z urządzenia
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function DadAccount() {
  const { data, access } = useApp();
  const [tab, setTab] = useState<"dane" | "powiadomienia" | "konto">("dane");
  return (
    <div className="space-y-6">
      <PageHeader title="Moje konto" description={`Konto partnera powiązane z ${data.mother.firstName} ${data.mother.lastName}.`} />
      <MotionTabs
        layoutId="dad-settings-tab"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "dane", label: "Moje dane", icon: <UserRound className="h-4 w-4" /> },
          { id: "powiadomienia", label: "Powiadomienia", icon: <Bell className="h-4 w-4" /> },
          { id: "konto", label: "Konto i prywatność", icon: <KeyRound className="h-4 w-4" /> },
        ]}
      />
      {tab === "dane" && (
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
            </CardBody>
          </Card>
        </div>
      )}
      {tab === "powiadomienia" && <NotificationSettings />}
      {tab === "konto" && <AccountTab />}
    </div>
  );
}
