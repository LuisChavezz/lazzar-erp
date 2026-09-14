import { useQuery } from "@tanstack/react-query";
import { getFacturasProveedor } from "../services/actions";
import type {
  FacturaProveedor,
  FacturaProveedorQueryParams,
} from "../interfaces/factura-proveedor.interface";

/**
 * useFacturasProveedor
 *
 * Facturas de proveedor para el selector del alta manual de CxP
 * (`GET /finanzas/facturas-proveedor/`).
 *
 * La consulta queda DESHABILITADA mientras `params.proveedor` no sea un id real:
 * la respuesta trae los renglones anidados de cada factura y no está paginada,
 * así que el listado de toda la empresa sería caro y, para una CxP, no significa
 * nada sin proveedor. Mismo criterio de centinela + `enabled` que el
 * `useCuentasPorPagar(proveedorId)` de `payments`.
 *
 * La llave incluye los parámetros, de modo que cambiar de proveedor consulta y
 * cachea por separado en vez de reusar las facturas del anterior.
 *
 * Devuelve TODAS las facturas del proveedor que coincidan con `params`: no
 * excluye las que ya tienen una CxP (el endpoint no ofrece ese filtro). Cruzarlas
 * contra el listado de CxP es cosa del selector.
 */
export const useFacturasProveedor = (params: FacturaProveedorQueryParams) => {
  const proveedor = params.proveedor ?? 0;

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    FacturaProveedor[]
  >({
    queryKey: ["facturas-proveedor", params],
    queryFn: () => getFacturasProveedor(params),
    enabled: proveedor > 0,
  });

  return {
    facturasProveedor: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
