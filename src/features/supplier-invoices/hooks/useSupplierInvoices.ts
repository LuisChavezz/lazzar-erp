import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getSupplierInvoices } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Facturas de proveedor de UN proveedor
 * (`GET /finanzas/facturas-proveedor/?proveedor={id}`).
 *
 * La respuesta no está paginada y anida `factura_proveedor_detalles` en cada
 * factura: sin acotar, cada carga, refetch o invalidación bajaría todos los
 * renglones de todas las facturas de la empresa, sin techo. Por eso la consulta
 * queda DESHABILITADA mientras `proveedorId` no sea un id real, y viaja con el
 * filtro de servidor `proveedor` (el `get_queryset` acepta también el alias
 * `proveedor_id`; se usa el nombre canónico). Mismo centinela + `enabled` que
 * `useFacturasProveedor` de `accounts-payable`.
 *
 * `DataTable` busca y filtra por estatus EN MEMORIA sobre el conjunto de ese
 * proveedor. No se pagina: el contrato plano es el de todo el módulo de finanzas.
 *
 * La llave cuelga de `["facturas-proveedor"]`, la raíz que invalidan todas las
 * escrituras del módulo (`invalidateSupplierInvoiceQueries`), y los parámetros van
 * en el segundo elemento como en el resto de llaves de esa raíz.
 *
 * Las facturas dadas de baja (`activo=false`) se descartan aquí: el backend no
 * las filtra del listado, y la pantalla no debe mostrarlas ni ofrecer acciones
 * sobre ellas. El tope de doble facturación las descarta con el mismo criterio
 * (`sumarFacturadoPorRecepcionDetalle`).
 */
export const useSupplierInvoices = (proveedorId: number) => {
  const params = { proveedor: proveedorId };
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    FacturaProveedor[]
  >({
    queryKey: ["facturas-proveedor", params],
    queryFn: () => getSupplierInvoices(params),
    enabled: proveedorId > 0,
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
