import { RequireProfile } from "@/components/layout/require-profile";
import { PartnerZone } from "@/components/partner/partner-zone";

export default function PartnerPage() {
  return (
    <RequireProfile>
      <PartnerZone />
    </RequireProfile>
  );
}
