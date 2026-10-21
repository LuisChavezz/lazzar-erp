import type { QueryClient } from "@tanstack/react-query";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * Escribe el cobro VIGENTE en el listado en caché, reemplazando su fila por
 * `id`. Hoy la única entrada bajo `["cobros"]` es el listado (`Cobro[]`,
 * `useCobros`); cualquier otra forma se deja intacta. Así la fila (y el detalle,
 * que se arma desde ella) refleja el estado del cobro en cuanto se conoce,
 * aunque el refetch posterior tarde o falle.
 */
export const writeCobroToList = (queryClient: QueryClient, cobro: Cobro) => {
  queryClient.setQueriesData({ queryKey: ["cobros"] }, (current: unknown) =>
    Array.isArray(current)
      ? (current as Cobro[]).map((row) => (row.id === cobro.id ? cobro : row))
      : current,
  );
};

/**
 * Invalida, por PREFIJO, todo lo que muestra datos que un cobro APLICADO mueve
 * (o devuelve al cancelarse): el saldo y estatus de cada CxC, el saldo de la
 * cuenta bancaria y su movimiento, la póliza, el desglose de la factura, el
 * resumen del cliente y el `cobrado_pct` de la trazabilidad del pedido. Mismo
 * conjunto para registrar y para cancelar un cobro.
 */
export const invalidateCobroEffects = (queryClient: QueryClient) => {
  [
    ["cobros"],
    ["finance-dashboard"],
    ["accounts-receivable"],
    ["accounts-receivable-detail"],
    ["bank-accounts"],
    ["bank-account-summary"],
    ["polizas"],
    ["invoice-desglose"],
    ["customer"],
  ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  invalidatePedidoProgress(queryClient);
};
