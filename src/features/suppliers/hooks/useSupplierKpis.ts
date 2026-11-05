import { useQuery } from "@tanstack/react-query";
import { KPI_QUERY_STALE_TIME } from "@/src/constants/queryCache";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getSupplierKpis } from "../services/actions";
import type { SupplierKpis } from "../interfaces/supplier-kpis.interface";

/**
 * Llave DENTRO del prefijo `["purchase-orders"]` (como el historial por
 * proveedor, `["purchase-orders", "by-supplier", …]`): las mutaciones de OC,
 * el alta de recepciones y la de inspecciones de calidad ya invalidan ese
 * prefijo, así que refrescan también estos indicadores sin tocarlas. Las
 * facturas de proveedor no lo invalidan: la agrega
 * `invalidateSupplierInvoiceQueries`. No va bajo `["purchase-orders", "kpis"]`
 * para no acoplarse a los indicadores de OC.
 */
export const supplierKpisQueryKey = ["purchase-orders", "supplier-kpis"] as const;

/**
 * Indicadores por proveedor (`GET /terceros/proveedores/kpis/`, EC-436).
 *
 * `staleTime` de 30 s (`KPI_QUERY_STALE_TIME`), mismo criterio que
 * `usePurchaseOrderKpis`: el backend los CALCULA en cada lectura a partir de
 * OCs, recepciones, inspecciones y facturas de proveedor que otro usuario
 * puede cambiar en otra sesión; pasados 30 s se releen al volver, y antes se
 * usa la caché. Las mutaciones de esta sesión invalidan la llave (ver arriba).
 * El detalle por factor (`useSupplierKpiDetail`) sí relee en cada apertura,
 * para no quedar más viejo que este ranking.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const useSupplierKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<SupplierKpis>({
    queryKey: supplierKpisQueryKey,
    queryFn: () => getSupplierKpis(),
    staleTime: KPI_QUERY_STALE_TIME,
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "supplier-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
