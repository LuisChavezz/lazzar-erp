/**
 * Reglas puras del PDF de la orden de producción (EC-857): identidad del
 * documento, pedidos con su cliente y renglones de habilitación. Sin React ni
 * `@react-pdf/renderer`, para probarlas en `tests/unit/`.
 */
import type { PedidoVinculadoCliente } from "@/src/features/orders/interfaces/pedido-vinculado.interface";
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { PRODUCTION_ORDER_STATUS_CODE } from "../constants/productionOrderStatus";
import type {
  ProductionOrderOnboarding,
  ProductionOrderOnboardingProducto,
} from "../interfaces/production-order.interface";
import { opPedidoRefs } from "./opPedidos";

/**
 * Identidad de una OP para su PDF. Se descarga en todos los estatus; la
 * CANCELADA (7) lleva la marca de la base, sin motivo (la OP no lo guarda).
 */
export const productionOrderPdfDescriptor = (
  op: Pick<ProductionOrderOnboarding, "op_id" | "folio_op" | "estatus_op">,
): DocumentPdfDescriptor => ({
  type: "OP",
  id: op.op_id,
  folio: op.folio_op,
  cancelled: op.estatus_op === PRODUCTION_ORDER_STATUS_CODE.CANCELLED,
});

/** Un pedido de la OP en el PDF. `cliente` solo existe si la respuesta lo trajo. */
export interface ProductionOrderPdfPedido {
  id: number;
  folio: string | null;
  cliente?: PedidoVinculadoCliente | null;
}

/**
 * Pedidos de la OP, con el mismo respaldo que el campo "Pedido" de la página
 * (`ProductionOrderPedidosField`): `pedidos` (principal primero, sin repetidos)
 * o, sin ellos, el pedido único (`pedido_vinculado`, y si no `pedido` +
 * `pedido_folio`). `[]` cuando la OP no tiene pedido. El cliente va POR PEDIDO:
 * cada pedido de una OP puede ser de un cliente distinto.
 */
export const productionOrderPdfPedidos = (
  op: Pick<ProductionOrderOnboarding, "pedidos" | "pedido" | "pedido_folio" | "pedido_vinculado">,
): ProductionOrderPdfPedido[] => {
  const refs = opPedidoRefs(op.pedidos, op.pedido);
  if (refs) return refs;
  if (op.pedido_vinculado) return [op.pedido_vinculado];
  return op.pedido == null ? [] : [{ id: op.pedido, folio: op.pedido_folio ?? null }];
};

/** Renglón de la tabla de habilitación: el material con y sin desperdicio. */
export interface ProductionOrderPdfHabilitacionRow {
  codigo: string;
  descripcion: string;
  unidad: string;
  /** `habilitacion[].total`: sin desperdicio (lo que muestra la página). */
  total: number;
  /**
   * `habilitacion_con_desperdicio[].total` del mismo material. La clave SOLO
   * existe si la respuesta trae `habilitacion_con_desperdicio` (sin ella la
   * columna se omite); `null` si ese material no aparece en la lista.
   */
  total_con_desperdicio?: string | null;
}

const habilitacionKey = (row: { codigo: string; descripcion: string; unidad: string }) =>
  JSON.stringify([row.codigo, row.descripcion, row.unidad]);

/**
 * Habilitación de un producto para el PDF. Las dos listas del backend tienen la
 * misma llave por material (`codigo`, `descripcion`, `unidad`), así que el
 * total con desperdicio se BUSCA por esa llave; no se calcula nada.
 */
export const productionOrderPdfHabilitacion = (
  producto: Pick<ProductionOrderOnboardingProducto, "habilitacion" | "habilitacion_con_desperdicio">,
): ProductionOrderPdfHabilitacionRow[] => {
  const conDesperdicio = producto.habilitacion_con_desperdicio;
  if (conDesperdicio === undefined) return producto.habilitacion.map((row) => ({ ...row }));
  const byKey = new Map(conDesperdicio.map((row) => [habilitacionKey(row), row.total]));
  return producto.habilitacion.map((row) => ({
    ...row,
    total_con_desperdicio: byKey.get(habilitacionKey(row)) ?? null,
  }));
};
