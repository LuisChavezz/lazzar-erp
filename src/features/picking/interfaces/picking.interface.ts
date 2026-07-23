/**
 * Contratos del endpoint de picking (`/wms/pickings/`).
 *
 * `GET` (listado) y `GET .../{id}/` (detalle) devuelven la MISMA forma
 * (`Picking`, con `picking_detalle` incluido en ambos) — a diferencia de
 * traspasos, que sí separa listado/detalle en dos tipos distintos. Por eso el
 * diálogo de detalle de picking no hace ningún fetch propio: reutiliza el
 * objeto ya cargado por el listado (ver `PickingDetailDialog`).
 *
 * `POST` crea un picking a partir de un `CreatePickingPayload` — el backend
 * deriva `picking_detalle` de las líneas del `pedido`, así que el payload de
 * creación no incluye detalle alguno.
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/**
 * Estatus posibles de un `Picking`. Hoy el backend solo asigna `"Pendiente"`
 * — los otros seis existen en el modelo pero nada los asigna todavía (ver
 * `constants/pickingStatus.ts`).
 */
export type PickingEstado =
  | "Pendiente"
  | "Asignado"
  | "En proceso"
  | "Pausado"
  | "Completado"
  | "Parcial"
  | "Cancelado";

/**
 * Estatus posibles de UNA LÍNEA de picking (`PickingDetalleLine.estado`) —
 * enum propio, distinto de `PickingEstado` (que es del picking completo). Hoy
 * solo se ha visto `"PENDIENTE"` en datos reales, pero los 5 valores están
 * documentados en el contrato del API.
 */
export type PickingDetalleEstado =
  | "PENDIENTE"
  | "SURTIDA"
  | "PARCIAL"
  | "FALTANTE"
  | "CANCELADA";

/**
 * Renglón de detalle del picking, tal cual viaja embebido en
 * `Picking.picking_detalle` (tanto en el listado como en el detalle — ver
 * nota de arriba). Solo uno de `producto`/`producto_variante` viene no-nulo
 * por línea (y su `_nombre` correspondiente); el otro par viaja en `null`.
 *
 * `lote` siempre es `null` hoy (igual que en traspasos) — se tipa por
 * completitud del contrato, pero la UI de detalle lo omite a propósito en vez
 * de mostrar un placeholder vacío destacado.
 */
export interface PickingDetalleLine {
  id: number;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  ubicacion: number | null;
  ubicacion_nombre: string | null;
  lote: string | null;
  cantidad_solicitada: string;
  cantidad_asignada: string;
  cantidad_surtida: string;
  estado: PickingDetalleEstado;
  operador: number | null;
  operador_nombre: string | null;
  fecha_surtido: string | null;
  diferencia: string;
  motivo_diferencia: string | null;
  observaciones: string | null;
}

/**
 * Renglón de `GET /wms/pickings/` (listado). Incluye `picking_detalle`
 * porque el backend lo devuelve en la misma respuesta del listado (a
 * diferencia de traspasos, que separa listado de detalle en dos formas
 * distintas) — se tipa aquí para que `Picking` sirva tanto para el listado
 * de hoy como para el detalle de una tarea futura, sin duplicar la interfaz.
 */
export interface Picking {
  id: number;
  folio: string;
  empresa: number;
  sucursal: number;
  pedido: number;
  pedido_folio: string;
  operador: number;
  operador_nombre: string;
  almacen: number;
  almacen_nombre: string;
  oleada: number | null;
  oleada_nombre: string | null;
  zona_almacen: number | null;
  zona_almacen_nombre: string | null;
  lote: number | null;
  lote_nombre: string | null;
  prioridad: string;
  tipo: string;
  estado: PickingEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_limite: string | null;
  total_lineas: number;
  total_lineas_completas: number;
  observaciones: string | null;
  usuario: number;
  usuario_nombre: string;
  created_at: string;
  updated_at: string;
  picking_detalle: PickingDetalleLine[];
}

/** Valores documentados de `prioridad` en la creación de un picking. */
export type PickingPrioridad = "BAJA" | "MEDIA" | "ALTA";

/** Valores documentados de `tipo` en la creación de un picking. */
export type PickingTipo =
  | "ORDER_PICKING"
  | "BATCH_PICKING"
  | "WAVE_PICKING"
  | "ZONE_PICKING";

/**
 * Cuerpo de `POST /wms/pickings/`.
 *
 * `operador` SÍ viaja en el payload (el backend lo requiere), pero no es un
 * campo del formulario: se deriva del usuario autenticado y se adjunta al
 * armar el payload (ver `usePickingForm`), nunca capturado ni mostrado en la
 * UI. `empresa`, `sucursal`, `folio` y `usuario` los resuelve el backend, por
 * eso NO forman parte de este tipo.
 */
export interface CreatePickingPayload {
  pedido: number;
  operador: number;
  almacen: number;
  prioridad: PickingPrioridad;
  tipo: PickingTipo;
  observaciones?: string;
}
