import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import {
  getProgramacionesValidas,
  type PedidoProgramacionValida,
} from "@/src/features/orders/utils/pedidoProgramacion";
import type {
  UltimaProgramacion,
  ScheduledParcialidadRow,
} from "../interfaces/scheduled-parcialidad.interface";

// Último guardado de la programación del PEDIDO. Todas las entradas traen la
// misma `fecha`/`usuario_*` (el backend las re-sella en cada guardado); aun así
// se toma la más reciente por si alguna vez difieren.
export const getUltimaProgramacion = (
  programaciones: PedidoProgramacionValida[],
): UltimaProgramacion | null => {
  let latest: UltimaProgramacion | null = null;
  for (const programacion of programaciones) {
    if (typeof programacion.fecha !== "string" || !programacion.fecha) continue;
    const time = new Date(programacion.fecha).getTime();
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) {
      latest = {
        fecha: programacion.fecha,
        time,
        usuario:
          typeof programacion.usuario_nombre === "string"
            ? programacion.usuario_nombre.trim() || null
            : null,
      };
    }
  }
  return latest;
};

// Una fila por parcialidad. Conserva el orden del backend (`-created_at, -id`)
// entre pedidos y el del arreglo dentro de cada pedido, así que sin ordenar la
// tabla las parcialidades de un folio quedan contiguas y en orden. Un pedido
// sin renglones válidos no produce filas.
export const flattenScheduledParcialidades = (
  orders: PedidoListItem[],
): ScheduledParcialidadRow[] =>
  orders.flatMap((order) => {
    const programaciones = getProgramacionesValidas(order.programacion_conf);
    const ultimaProgramacion = getUltimaProgramacion(programaciones);
    return programaciones.map((programacion, indice) => ({
      rowId: `${order.id}-${indice}`,
      pedidoId: order.id,
      folio: order.folio,
      oc: order.oc,
      cliente_razon_social: order.cliente_razon_social,
      estatus: order.estatus,
      clasificacion: order.clasificacion,
      fecha_entrega_min: order.fecha_entrega_min,
      fecha_entrega_max: order.fecha_entrega_max,
      created_at: order.created_at,
      subtotal: order.subtotal,
      ultimaProgramacion,
      totalParcialidades: programaciones.length,
      indice,
      destino: programacion.destino,
      cantidad: programacion.cantidad,
      comentarios: programacion.comentarios,
    }));
  });
