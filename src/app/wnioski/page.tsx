import { RequireProfile } from "@/components/layout/require-profile";
import { Applications } from "@/components/forms/applications";

export default function WnioskiPage() {
  return (
    <RequireProfile>
      <Applications />
    </RequireProfile>
  );
}
