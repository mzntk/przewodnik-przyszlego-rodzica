import { PageHeader } from "@/components/ui/misc";
import { MapTab } from "@/components/organize/organize-view";

export default function PlacowkiPage() {
  return (
    <div>
      <PageHeader title="Placówki w pobliżu" description="Oddziały ZUS, urzędy stanu cywilnego, przychodnie POZ i szpitale położnicze." />
      <MapTab />
    </div>
  );
}
