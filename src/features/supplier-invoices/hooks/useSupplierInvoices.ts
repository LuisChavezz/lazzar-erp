import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getSupplierInvoices } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Listado de facturas de proveedor (`GET /finanzas/facturas-proveedor/`).
 *
 * Arreglo plano sin paginación; `DataTable` busca, filtra y pagina en memoria.
 * Se pide SIN parámetros: la tabla no tiene puente hacia filtros de servidor y
 * una sola entrada de caché sirve a toda la pantalla (mismo criterio que
 * `usePolizas`). El backend ya acota por empresa.
 *
 * La llave cuelga de `["facturas-proveedor"]`, la raíz que invalidan todas las
 * escrituras del módulo (`invalidateSupplierInvoiceQueries`).
 *
 * Las facturas dadas de baja (`activo=false`) se descartan aquí: el backend no
 * las filtra del listado, y la pantalla no debe mostrarlas ni ofrecer acciones
 * sobre ellas. El tope de doble facturación las descarta con el mismo criterio
 * (`sumarFacturadoPorRecepcionDetalle`).
 */
export const useSupplierInvoices = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    FacturaProveedor[]
  >({
    queryKey: ["facturas-proveedor", {}],
    queryFn: () => getSupplierInvoices(),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "facturas-proveedor-refetch-error",
  });

  return {
    facturas: (data ?? []).filter((factura) => factura.activo !== false),
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
