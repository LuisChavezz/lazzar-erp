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
 *
 * El parámetro `lista` de esta URL es el estado del listado del que se llegó
 * (lo pone "Ver detalle"): la query se pasa cruda y el detalle lo valida para
 * su "Volver".
 */
export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <div className="w-full space-y-6 pt-2">
      <OpportunityDetailContent opportunityId={id} searchParams={query} />
    </div>
  );
}
