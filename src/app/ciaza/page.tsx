import { Suspense } from "react";
import { PregnancyView } from "@/components/pregnancy/pregnancy-view";

export default function CiazaPage() {
  return (
    <Suspense>
      <PregnancyView />
    </Suspense>
  );
}
