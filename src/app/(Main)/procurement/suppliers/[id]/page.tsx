import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { SupplierDetailContent } from "@/src/features/suppliers/components/SupplierDetailContent";

/**
 * Detalle de un proveedor — `GET /terceros/proveedores/{id}/` más su historial
 * de órdenes de compra.
 *
 * Por el `startsWith` del proxy cae en la regla `/procurement/suppliers` de
 * `routePermissions.ts` y exige `R-COMPRAS-PROV`; junto con el matcher de
 * `proxy.ts` no hace falta registrar nada. Su entrada oculta en `appRoutes.ts`
 * (`showInSidebar: false`) solo la cuelga de Proveedores para la navegación.
 */
export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="w-full space-y-6 pt-2">
      {/* El historial lee sus filtros de la URL con `useSearchParams`, que en
          Next.js requiere un límite de Suspense en el árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando proveedor..." />}>
        <SupplierDetailContent supplierId={id} />
      </Suspense>
    </div>
  );
}
