/**
 * Contrato de la programación de un pedido por Mesa de Control
 * (`PATCH /ventas/pedidos/{id}/programar/`).
 *
 * REEMPLAZO TOTAL e idempotente: la lista enviada sustituye por completo a la
 * guardada. Editar = reenviar la lista entera, incluidas las entradas que no
 * cambiaron; una lista vacía borra la programación.
 */
import type { PedidoProgramacionDestino } from "../constants/pedidoProgramacion";

/**
 * Una programación GUARDADA, tal como la devuelve `programacion_conf`.
 *
 * `destino` se tipa como `string` y no como `PedidoProgramacionDestino`: es un
 * `JSONField` y el tipo debe describir lo que puede traer, no lo que el
 * endpoint de escritura acepta hoy. Se estrecha con
 * `isPedidoProgramacionDestino`.
 *
 * `fecha`, `usuario_id` y `usuario_nombre` los SELLA EL SERVIDOR al guardar:
 * para el frontend son de solo lectura y nunca viajan en el payload.
 *
 * `comentarios` es opcional: las entradas guardadas antes de que existiera no
 * traen la clave. El servidor guarda un `null` como `""`.
 */
export interface PedidoProgramacion {
  destino: string;
  cantidad: number;
  comentarios?: string | null;
  fecha?: string;
  usuario_id?: number;
  usuario_nombre?: string;
}

/**
 * `Pedido.programacion_conf`. El modelo lo declara `JSONField(default=dict)`,
 * así que un pedido nunca programado trae `{}` (sin `programaciones`).
 */
export interface PedidoProgramacionConf {
  programaciones?: PedidoProgramacion[];
}

/**
 * Una entrada del payload: `destino`, `cantidad` y `comentarios` (máx. 500;
 * `null` cuando no hay comentario).
 */
export interface PedidoProgramacionInput {
  destino: PedidoProgramacionDestino;
  cantidad: number;
  comentarios?: string | null;
}

/** Cuerpo del PATCH. */
export interface PedidoProgramarPayload {
  programaciones: PedidoProgramacionInput[];
}

/**
 * Respuesta del PATCH. `total_piezas` es el total AUTORITATIVO del servidor
 * (suma de `PedidoDetalleTalla.cantidad` sin líneas de muestra) y
 * `programacion_conf` lo releído de base de datos, ya con el sello de
 * fecha/usuario.
 */
export interface PedidoProgramarResponse {
  pedido_id: number;
  total_piezas: number;
  total_parcialidades: number;
  programacion_conf: PedidoProgramacionConf;
}

/**
 * Un renglón de `GET /ventas/pedidos/{id}/programar/`: UNA talla del pedido
 * (`PedidoDetalleTalla`), no una línea producto+color. `pedido_detalle_id` es
 * su partida (`PedidoDetalle`, el mismo `detalles[].id` del detalle del
 * pedido); el backend las ordena por partida, así que llegan contiguas.
 *
 * `stock_disponible` es la existencia en el almacén `almacen_surtido` (hoy
 * ALM-00, PRODUCTO TERMINADO) menos las reservas activas de OTROS pedidos, ya
 * calculada por el backend: por variante o, si el producto no tiene ninguna
 * variante, por producto. `faltante` es `max(cantidad - stock_disponible, 0)`.
 * Ambos son `null` cuando la línea es de muestra, no tiene producto, o la talla
 * no tiene variante pero su producto sí tiene variantes (talla sin resolver).
 *
 * `servicios` se tipa como `string[]` (no como `PedidoProgramarServicio[]`):
 * el backend podría sumar uno nuevo; la etiqueta lo resuelve
 * `getPedidoProgramarServicioLabel`.
 */
export interface PedidoProgramarRenglon {
  pedido_detalle_talla_id: number;
  pedido_detalle_id: number;
  producto: string | null;
  /**
   * Opcionales: el backend los agregó después; en muestras traen la categoría
   * de la línea. `producto_nombre_corto` viene recortado a 40 caracteres sin
   * partir palabras.
   */
  categoria_id?: number | null;
  categoria_nombre?: string | null;
  producto_nombre_corto?: string | null;
  color: string | null;
  talla: string;
  sku: string | null;
  variante_id: number | null;
  es_muestra: boolean;
  cantidad: number;
  servicios: string[];
  stock_disponible: number | null;
  faltante: number | null;
}

/**
 * `GET /ventas/pedidos/{id}/programar/`: todo lo que pinta "Programar pedido"
 * en una sola lectura. `programacion_conf` nunca es `null` (el backend manda
 * `{ programaciones: [] }` si no hay nada), pero viene de un `JSONField`, así
 * que se lee con `getProgramacionesValidas`.
 */
export interface PedidoProgramarContexto {
  pedido_id: number;
  folio: string | null;
  almacen_surtido: string;
  total_piezas: number;
  destinos_aplicables: string[];
  programacion_conf: PedidoProgramacionConf;
  renglones: PedidoProgramarRenglon[];
}
