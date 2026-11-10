import ModuleNav from "@/src/components/ModuleNav";
import { CompanyGate } from "@/src/features/workspace/components/CompanyGate";

/**
 * Calendario y correos son de la cuenta de Google del usuario, no de la empresa:
 * quedan fuera del gate de empresa (EC-842).
 */
const SALES_COMPANY_EXEMPT = ["/sales/calendar", "/sales/emails"] as const;

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <ModuleNav moduleKey="sales" />
      <CompanyGate exempt={SALES_COMPANY_EXEMPT}>{children}</CompanyGate>
    </div>
  );
}
