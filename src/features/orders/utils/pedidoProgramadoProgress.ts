import { PEDIDO_ESTATUS } from "../constants/pedidoStatus";
import type { PedidoListItem } from "../interfaces/order.interface";
import { getProgramacionesValidas } from "./pedidoProgramacion";

/**
 * "Programado X de Y" de un renglón del listado de pedidos (EC-737).
 *
 * - `programado` (X): suma de `parcialidades[].cantidad`; un renglón inválido o
 *   con una cantidad que no es un número finito no suma.
 * - `total` (Y): `piezas_programables`, o `piezas` si el backend no lo manda.
 *   Muestras incluidas, igual que el techo de `PATCH .../programar/`.
 * - `excedente`: lo que X pasa de Y (0 si no se pasa).
 * - `visible`: no se pinta en un pedido CANCELADO ni con Y = 0.
 */
export interface PedidoProgramadoProgress {
  programado: number;
  total: number;
  excedente: number;
  visible: boolean;
}

type PedidoProgramadoSource = Pick<
  PedidoListItem,
  "estatus" | "piezas" | "piezas_programables" | "parcialidades"
>;

export const getPedidoProgramadoProgress = (
  order: PedidoProgramadoSource,
): PedidoProgramadoProgress => {
  const programado = getProgramacionesValidas({ programaciones: order.parcialidades }).reduce(
    (sum, parcialidad) =>
      Number.isFinite(parcialidad.cantidad) ? sum + parcialidad.cantidad : sum,
    0,
  );
  const total = order.piezas_programables ?? order.piezas;
  return {
    programado,
    total,
    excedente: Math.max(0, programado - total),
    visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO && total > 0,
  };
};
