import { PEDIDO_ESTATUS } from "../constants/pedidoStatus";
import type { PedidoListItem } from "../interfaces/order.interface";
import { getProgramacionesValidas } from "./pedidoProgramacion";

/**
 * "Programado X de Y" de un renglón del listado de pedidos (EC-737).
 *
 * - `programado` (X): suma de `parcialidades[].cantidad`, o de
 *   `programacion_conf.programaciones` si el backend no manda `parcialidades`.
 *   Solo suman cantidades enteras positivas (lo único que acepta el PATCH); un
 *   renglón inválido del `JSONField` no suma.
 * - `total` (Y): `piezas_programables`, o `piezas` si el backend no lo manda.
 *   Muestras incluidas, igual que el techo de `PATCH .../programar/`.
 * - `excedente`: lo que X pasa de Y (0 si no se pasa).
 * - `visible`: no se pinta en un pedido CANCELADO ni cuando X e Y son 0. Con
 *   Y = 0 y X > 0 (tallas quitadas tras programar) sí, como excedente.
 */
export interface PedidoProgramadoProgress {
  programado: number;
  total: number;
  excedente: number;
  visible: boolean;
}

type PedidoProgramadoSource = Pick<
  PedidoListItem,
  "estatus" | "piezas" | "piezas_programables" | "parcialidades" | "programacion_conf"
>;

export const getPedidoProgramadoProgress = (
  order: PedidoProgramadoSource,
): PedidoProgramadoProgress => {
  const programaciones =
    order.parcialidades !== undefined
      ? { programaciones: order.parcialidades }
      : order.programacion_conf;
  const programado = getProgramacionesValidas(programaciones).reduce(
    (sum, parcialidad) =>
      Number.isInteger(parcialidad.cantidad) && parcialidad.cantidad > 0
        ? sum + parcialidad.cantidad
        : sum,
    0,
  );
  const total = order.piezas_programables ?? order.piezas;
  return {
    programado,
    total,
    excedente: Math.max(0, programado - total),
    visible: order.estatus !== PEDIDO_ESTATUS.CANCELADO && (total > 0 || programado > 0),
  };
};
