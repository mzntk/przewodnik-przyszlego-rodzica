import { Suspense } from "react";
import { Landing } from "@/components/landing/landing";

export default function Home() {
  return (
    <Suspense>
      <Landing />
    </Suspense>
  );
}
