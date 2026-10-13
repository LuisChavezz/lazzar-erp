import { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import OpportunityList from "@/src/features/opportunities/components/OpportunityList";

export const metadata: Metadata = {
  title: "Oportunidades | ERP",
  description: "Prospectos y negocios en curso del CRM.",
};

/**
 * Oportunidades del CRM. Sin regla propia de permisos: la cubre el catch-all
 * `/sales` → `R-CRM` de `routePermissions`.
 */
export default function OpportunitiesPage() {
  return (
    <div className="w-full">
      {/* `OpportunityList` lee filtros, búsqueda, orden y página desde la URL
          con `useSearchParams`, que en Next.js requiere un límite de Suspense
          en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando oportunidades..." />}>
        <OpportunityList />
      </Suspense>
    </div>
  );
}
