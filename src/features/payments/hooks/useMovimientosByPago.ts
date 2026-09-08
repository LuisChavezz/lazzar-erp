import { useQuery } from "@tanstack/react-query";
import { getMovimientosByPago } from "../services/actions";
import { MovimientoBancario } from "../interfaces/movimiento-bancario.interface";

/**
 * Movimientos bancarios ligados a UN pago.
 *
 * `pagoId` acepta `null` como centinela de "ningún detalle abierto" y la
 * consulta queda deshabilitada en ese caso: es un endpoint aparte del listado y
 * no debe dispararse mientras el diálogo esté cerrado. Mismo criterio de
 * centinela + `enabled` que `useBankAccountSummary` y `useCuentasPorPagar`.
 *
 * La clave incluye el id, así que cada pago cachea sus movimientos por separado
 * y `useCancelPago` puede invalidar exactamente el del pago que canceló.
 */
export const useMovimientosByPago = (pagoId: number | null) => {
  const { data, isLoading, isError, error } = useQuery<MovimientoBancario[]>({
    queryKey: ["movimientos-por-pago", pagoId],
    queryFn: () => getMovimientosByPago(pagoId as number),
    enabled: pagoId !== null && pagoId > 0,
  });

  return {
    movimientos: data ?? [],
    isLoading,
    isError,
    error,
  };
};
