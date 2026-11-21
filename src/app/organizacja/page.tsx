import { redirect } from "next/navigation";

/** Dawna zakładka „Organizacja i wiedza” – przeniesiona do Kalendarza ciąży. */
export default function OrganizacjaPage() {
  redirect("/ciaza");
}
