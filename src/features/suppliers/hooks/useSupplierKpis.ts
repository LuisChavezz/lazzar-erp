import { useQuery } from "@tanstack/react-query";
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
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de OCs, recepciones, inspecciones y facturas de proveedor que otro usuario
 * puede cambiar en otra sesión. A diferencia de los indicadores de OC y de
 * recepciones (`PROCUREMENT_KPI_STALE_TIME`), sin caché corta: el detalle por
 * factor (`useSupplierKpiDetail`) también se lee en cada apertura, y con caché
 * en uno solo de los dos el detalle podría no cuadrar con el puntaje del
 * ranking que explica (EC-724, EC-771).
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const useSupplierKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<SupplierKpis>({
    queryKey: supplierKpisQueryKey,
    queryFn: () => getSupplierKpis(),
    refetchOnMount: "always",
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
