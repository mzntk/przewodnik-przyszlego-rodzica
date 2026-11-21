"use client";
import { Dices, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { useMounted } from "@/hooks/use-mounted";
import { FAMILY_COUNT, SCENARIO_INFO, familyByNo } from "@/data/families";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

/**
 * Tryb testowy: rodzina przypięta do urządzenia + przycisk „wyloguj się i wylosuj inną rodzinę”.
 * Widoczny na ekranie logowania, w menu bocznym i w menu mobilnym.
 */
export function TestModeBox({ className, compact }: { className?: string; compact?: boolean }) {
  const mounted = useMounted();
  const router = useRouter();
  const { familyNo, drawNewFamily } = useApp();
  const fam = mounted && familyNo ? familyByNo(familyNo) : null;

  function draw() {
    if (!confirm("Wylogować i wylosować inną rodzinę? Dane wpisane na tym urządzeniu (kalendarz, imię dziecka, wnioski) zostaną usunięte.")) return;
    drawNewFamily();
    toast.success("Wylosowano nową rodzinę – zaloguj się, aby zobaczyć jej dane");
    router.replace("/");
  }

  return (
    <div className={cn("rounded-xl border-2 border-dashed border-gold/50 bg-gold-soft/60 p-3", className)}>
      <div className="flex items-center gap-1.5 text-[13px] font-bold tracking-wide text-gold uppercase">
        <FlaskConical className="h-4 w-4" /> Tryb testowy
        <InfoTip title="Jak działa logowanie testowe?" className="ml-auto text-gold">
          <p>
            Żeby dobrze zasymulować logowanie przez mObywatel, aplikacja <b>zawsze loguje Cię na tę samą rodzinę</b> – tak jak prawdziwy mObywatel zawsze potwierdza tę samą tożsamość. Dzięki temu Twoje wpisy (kalendarz, imię dziecka, wysłane wnioski) zostają po ponownym zalogowaniu.
          </p>
          <p>Mama i tata z tego urządzenia należą do tej samej rodziny. Przy pierwszym logowaniu losujemy jedną z {FAMILY_COUNT} fikcyjnych rodzin.</p>
          <p className="font-bold text-fg">W puli są różne scenariusze:</p>
          <ul className="list-disc space-y-1 pl-4">
            {SCENARIO_INFO.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p>Chcesz sprawdzić inną sytuację? Użyj przycisku „Wylosuj inną rodzinę”.</p>
        </InfoTip>
      </div>
      {!compact && (
        <p className="mt-1.5 text-[13px] leading-snug text-fg-2">
          {fam ? (
            <>
              Rodzina nr <b className="num">{fam.no}</b>: {fam.input.mother.firstName} i {fam.input.father?.firstName} {fam.input.father?.lastName ?? fam.input.mother.lastName}
              <span className="block text-muted">{fam.scenario}</span>
            </>
          ) : (
            <>Przy pierwszym logowaniu wylosujemy jedną ze {FAMILY_COUNT} fikcyjnych rodzin.</>
          )}
        </p>
      )}
      {fam && (
        <button onClick={draw} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gold/60 bg-white px-3 py-2 text-[14px] font-bold text-gold transition hover:bg-gold-soft">
          <Dices className="h-4 w-4" /> Wyloguj się i wylosuj inną rodzinę
        </button>
      )}
    </div>
  );
}
