import { Suspense } from "react";
import { RequireProfile } from "@/components/layout/require-profile";
import { Calculator } from "@/components/calculator/calculator";

export default function KalkulatorPage() {
  return (
    <RequireProfile>
      <Suspense>
        <Calculator />
      </Suspense>
    </RequireProfile>
  );
}
