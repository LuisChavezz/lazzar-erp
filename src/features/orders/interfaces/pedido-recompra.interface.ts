import type { QuoteById } from "@/src/features/quotes/interfaces/quote.interface";

/**
 * Respuesta 201 de `POST /ventas/pedidos/{id}/recomprar/`: la cotización NUEVA
 * (estatus 1 BORRADOR, `recompra: true`, `vendedor` = quien la pidió) clonada
 * del pedido, con sus partidas y servicios. Forma verificada contra una
 * respuesta real.
 *
 * Parecida a la de `POST /cotizaciones/onboarding/` pero NO idéntica: aquí no
 * hay llave `pedido`, sino `pedido_origen` (el id del pedido clonado).
 */
export interface PedidoRecompraResponse {
  /**
   * Modelo `Cotizacion` crudo (`fields="__all__"`): sin `estatus_label` ni los
   * nombres del cliente que agrega `CotizacionFullSerializer`, y sin relaciones
   * anidadas (van en las llaves hermanas). Trae además campos del modelo que
   * `QuoteById` no declara (banderas de origen, `clasificacion`,
   * `programacion_conf`…); no se tipan porque nadie los lee.
   */
  cotizacion: Omit<
    QuoteById,
    "detalles" | "servicios_extras" | "estatus_label" | "cliente_nombre" | "cliente_razon_social"
  >;
  /** Mismas partidas (con `tallas` anidadas y nombres resueltos) que el retrieve. */
  detalles: QuoteById["detalles"];
  servicios_extras: PedidoRecompraServicioExtra[];
  pedido_origen: number;
}

/**
 * Servicio extra de la cotización nueva. OJO: a diferencia del retrieve,
 * `monto` llega como NÚMERO (no string decimal) y no trae `cotizacion` ni
 * timestamps.
 */
export interface PedidoRecompraServicioExtra {
  id: number;
  nombre: string;
  monto: number;
  cantidad: number;
  visible_en_factura: boolean;
}
