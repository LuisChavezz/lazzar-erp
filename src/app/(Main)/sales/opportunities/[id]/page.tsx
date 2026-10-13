import { Metadata } from "next";
import { OpportunityDetailContent } from "@/src/features/opportunities/components/OpportunityDetailContent";

export const metadata: Metadata = {
  title: "Oportunidad | ERP",
  description: "Detalle de una oportunidad del CRM: datos, cotizaciones y cartera del cliente.",
};

/**
 * Detalle de una oportunidad. Sin regla propia de permisos: la cubre el
 * catch-all `/sales` → `R-CRM` de `routePermissions`, igual que su listado. El
 * acceso al REGISTRO lo decide el backend (404 si no es visible) y lo resuelve
 * `OpportunityDetailContent` en el cliente.
 */
export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full space-y-6 pt-2">
      <OpportunityDetailContent opportunityId={id} />
    </div>
  );
}
