import { ConfigContent } from "@/src/features/config/components/ConfigContent";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/src/lib/auth";
import { hasPermission } from "@/src/utils/permissions";

export default async function ConfigPage() {
  const session = await getServerSession(authOptions);
  const canReadConfig = hasPermission("R-CONF", session?.user);
  if (!canReadConfig) {
    redirect("/dashboard");
  }

  return (
    <div className="w-full mt-4">
      <ConfigContent />
    </div>
  );
}
