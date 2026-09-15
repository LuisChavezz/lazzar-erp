import { useQuery } from "@tanstack/react-query";
import { getSupplierInvoices } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { qtyToUnits } from "../schemas/supplier-invoice.schema";

/**
 * Cantidad YA FACTURADA por renglón de recepción, en DIEZMILÉSIMAS enteras
 * (`recepcion_detalle` → unidades), sumando todas las facturas NO canceladas.
 *
 * Una factura `Cancelada` no cuenta: su mercancía vuelve a estar disponible para
 * facturarse. Una dada de baja (`activo=false`) tampoco, por la misma razón: el
 * backend no la filtra del listado, pero ya no respalda nada. `Borrador` SÍ
 * cuenta: es un documento vivo que puede registrarse en cualquier momento, y
 * dejar facturar la misma cantidad en paralelo produciría dos CxP por la misma
 * mercancía.
 */
export const sumarFacturadoPorRecepcionDetalle = (
  facturas: FacturaProveedor[],
): Map<number, number> => {
  const facturado = new Map<number, number>();
  for (const factura of facturas) {
    if (factura.estatus === "Cancelada" || factura.activo === false) continue;
    for (const detalle of factura.factura_proveedor_detalles) {
      const units = qtyToUnits(detalle.cantidad) ?? 0;
      facturado.set(
        detalle.recepcion_detalle,
        (facturado.get(detalle.recepcion_detalle) ?? 0) + units,
      );
    }
  }
  return facturado;
};

/**
 * Facturas de proveedor de UNA recepción
 * (`GET /finanzas/facturas-proveedor/?recepcion={id}`), para el tope de doble
 * facturación del selector de partidas.
 *
 * ─── ES UN BLOQUEO SUAVE ─────────────────────────────────────────────────────
 *
 * El backend NO impide facturar dos veces el mismo renglón de recepción. Este
 * tope se calcula con lo que había en el momento de la consulta: dos usuarios
 * capturando facturas de la misma recepción al mismo tiempo pueden, ambos, ver
 * la cantidad completa disponible y registrar las dos. Solo una validación en el
 * backend (con bloqueo de fila) cerraría esa carrera.
 *
 * El filtro va al SERVIDOR (el `get_queryset` acepta `recepcion`) y no se trae
 * el listado completo: la respuesta anida los renglones y no está paginada.
 *
 * La llave cuelga de `["facturas-proveedor"]`, así que cualquier escritura del
 * módulo la invalida (ver `invalidateSupplierInvoiceQueries`).
 */
export const useSupplierInvoicesByRecepcion = (recepcionId: number) => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    FacturaProveedor[]
  >({
    queryKey: ["facturas-proveedor", { recepcion: recepcionId }],
    queryFn: () => getSupplierInvoices({ recepcion: recepcionId }),
    enabled: recepcionId > 0,
  });

  return {
    facturas: data ?? [],
    isLoading,
    /**
     * `true` también en un refetch en SEGUNDO PLANO (`isLoading` solo lo es en la
     * primera carga). Mientras dura, `facturas` es la caché anterior —p. ej. la
     * que invalidó el alta de otra factura— y lo "ya facturado" puede estar viejo.
     */
    isFetching,
    isError,
    error,
    refetch,
  };
};
