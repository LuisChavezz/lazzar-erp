import type { QueryClient } from "@tanstack/react-query";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Invalidación compartida por TODAS las escrituras de facturas de proveedor
 * (alta, edición y —en la parte 2— las acciones de fila), para que ninguna se
 * olvide de una caché.
 *
 * - `["facturas-proveedor"]` por PREFIJO: cubre el listado, la consulta por
 *   recepción del selector (el tope de doble facturación) y el selector de
 *   facturas de `accounts-payable`, que usa esa misma raíz de llave.
 * - `["cuentas-por-pagar"]` solo cuando la factura quedó `Registrada`: registrar
 *   genera (o revive) su CxP. Por prefijo alcanza tanto la llave de
 *   `accounts-payable` como la de `payments`.
 * - `["purchase-orders", oc]`, el retrieve de la OC de ESTA factura
 *   (`purchaseOrderQueryOptions`): sus "documentos relacionados" listan las
 *   facturas de proveedor con su estatus. Dirigida a esa OC y no a
 *   `["purchase-orders"]`: el listado de OC no muestra facturas, y la respuesta
 *   de la escritura ya dice cuál es.
 *
 * Devuelve la promesa del refetch: una acción de fila la espera (la mutación
 * sigue "pending" hasta que el listado refleja el nuevo estatus, igual que el
 * `onSettled` de `useCancelPago`), mientras que el alta puede ignorarla.
 */
export const invalidateSupplierInvoiceQueries = (
  queryClient: QueryClient,
  factura: Pick<FacturaProveedor, "estatus" | "oc">,
): Promise<unknown> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] }),
    factura.estatus === "Registrada"
      ? queryClient.invalidateQueries({ queryKey: ["cuentas-por-pagar"] })
      : Promise.resolve(),
    queryClient.invalidateQueries({ queryKey: ["purchase-orders", factura.oc] }),
  ]);
