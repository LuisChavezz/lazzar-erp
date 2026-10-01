import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PedidoProgramacionValida } from "@/src/features/orders/utils/pedidoProgramacion";

// "Última vez que se guardó la programación" del PEDIDO. El backend re-sella
// `fecha`/`usuario_*` en TODOS los renglones en cada guardado, así que es dato
// del pedido: se repite igual en todas sus parcialidades y nunca es "de la fila".
export interface UltimaProgramacion {
  fecha: string;
  /** Instante en ms, para ordenar cronológicamente sin depender del offset. */
  time: number;
  usuario: string | null;
}

// Una fila de "Pedidos programados": UNA parcialidad (un elemento válido de
// `programacion_conf.programaciones`). Los campos del pedido se repiten en
// cada parcialidad del mismo folio; los de la parcialidad van al final.
export interface ScheduledParcialidadRow
  extends Pick<
    PedidoListItem,
    | "folio"
    | "oc"
    | "cliente_razon_social"
    | "estatus"
    | "clasificacion"
    | "fecha_entrega_min"
    | "fecha_entrega_max"
    | "created_at"
    | "subtotal"
  > {
  /** `${pedidoId}-${indice}`: identidad estable de la fila en la tabla. */
  rowId: string;
  pedidoId: number;
  ultimaProgramacion: UltimaProgramacion | null;
  /** Renglones válidos del pedido: el "M" de "N de M". */
  totalParcialidades: number;
  /** Posición 0-based dentro del arreglo VÁLIDO (ya sin elementos descartados). */
  indice: number;
  destino: PedidoProgramacionValida["destino"];
  cantidad: PedidoProgramacionValida["cantidad"];
  comentarios: PedidoProgramacionValida["comentarios"];
}
