/**
 * Contratos del endpoint de packing (`/wms/packings/`).
 *
 * `Packing` es el registro de empaque de mercancía YA recolectada por un
 * `Picking` — se ancla a un picking (no directamente a un pedido):
 * `pedido`/`empresa`/`sucursal`/`operador` son copias denormalizadas del
 * picking origen, nunca capturadas por el cliente. Un mismo picking puede
 * acumular varios packings (empaques parciales sucesivos).
 *
 * Hoy el backend solo asigna `estado: "PENDIENTE"` — los otros tres valores
 * existen en el modelo pero nada los asigna todavía (no existe endpoint de
 * transición). Este módulo es, por ahora, un registro documental: crear un
 * packing NO mueve inventario ni cambia el estado del picking origen.
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/**
 * Estatus posibles de un `Packing` (y, por el mismo enum en el backend, de
 * cada línea de `PackingDetalle`). A diferencia de `PickingEstado`, aquí los
 * valores van en MAYÚSCULAS. Hoy solo se ha visto `"PENDIENTE"` en datos
 * reales — los otros tres se cubren desde ahora (ver
 * `constants/packingStatus.ts`).
 */
export type PackingEstado = "PENDIENTE" | "EN_PROCESO" | "COMPLETADO" | "CANCELADO";

/**
 * Renglón de detalle del packing, tal cual viaja embebido en
 * `Packing.packing_detalle` (listado y detalle comparten el mismo
 * `PackingSerializer` — sin fetch propio para el diálogo de detalle, ver
 * `PackingDetailDialog`). Solo uno de `producto`/`producto_variante` viene
 * no-nulo por línea (y su `_nombre` correspondiente) — mismo patrón que
 * `PickingDetalleLine`.
 *
 * `talla_id` es OPCIONAL de verdad (la clave puede faltar por completo, no
 * solo venir `null`): su origen en el backend es una cadena de atributos de
 * varios saltos (`picking_detalle.pedido_detalle_talla.variante.talla_id`)
 * SIN `default` — si `pedido_detalle_talla` es `null`, DRF revienta la cadena
 * a medio camino y omite la clave (`SkipField`) en vez de serializar `null`.
 * `talla_nombre` NO tiene este problema (declara `default=None`), por eso se
 * tipa distinto pese a compartir el mismo origen accidentado.
 */
export interface PackingDetalleLine {
  id: number;
  packing: number;
  caja: number | null;
  caja_numero: number | null;
  picking_detalle: number;
  cantidad_empacada: string;
  estado: PackingEstado;
  observaciones: string | null;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  pedido_detalle: number | null;
  pedido_detalle_talla: number | null;
  talla_id?: number | null;
  talla_nombre: string | null;
  cantidad_asignada: string;
  cantidad_solicitada: string;
  cantidad_surtida: string;
  ubicacion: number | null;
  ubicacion_nombre: string | null;
}

/**
 * Renglón de `GET /wms/packings/` (listado). `empresa`/`sucursal` viajan
 * como ids crudos, sin `_nombre` resuelto (a diferencia de todos los demás
 * FK de esta forma) — no se intenta mostrar su nombre en la UI.
 */
export interface Packing {
  id: number;
  folio: string;
  estado: PackingEstado;
  numero_cajas: number;
  peso_total: string;
  volumen_total: string;
  observaciones: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  empresa: number;
  sucursal: number;
  pedido: number;
  pedido_folio: string | null;
  picking: number;
  picking_folio: string;
  picking_estado: string;
  picking_almacen: number;
  picking_almacen_nombre: string | null;
  operador: number;
  operador_nombre: string;
  usuario: number;
  usuario_nombre: string;
  packing_detalle: PackingDetalleLine[];
}

/**
 * Una línea de `packing_detalle` a enviar en la creación (distinta de
 * `PackingDetalleLine`, la forma de LECTURA del listado, y de
 * `PackingOnboardingLine`, la forma candidata del onboarding — las tres
 * comparten el nombre `packing_detalle` en sus respectivos endpoints pero son
 * shapes distintos, por eso se tipan por separado). Solo `picking_detalle` +
 * `cantidad_empacada` son necesarios; `pedido_detalle_talla` NO viaja aquí —
 * es informativo en el onboarding, no parte de lo que se envía.
 */
export interface CreatePackingDetalleLine {
  picking_detalle: number;
  cantidad_empacada: string;
  observaciones?: string;
}

/**
 * Cuerpo de `POST /wms/packings/` (idéntico a `POST .../onboarding/`).
 *
 * `operador`, `empresa`, `sucursal`, `pedido`, `folio`, `usuario` y `estado`
 * los resuelve el backend a partir del `picking` elegido — por eso NO forman
 * parte de este tipo (mismo criterio que `CreatePickingPayload`, que ya
 * excluye los campos que el backend deriva).
 *
 * `numero_cajas`/`peso_total`/`volumen_total`/`fecha_inicio`/`fecha_fin`/
 * `observaciones` son opcionales en el backend (todos tienen default o
 * admiten `null`). `fecha_inicio`/`fecha_fin` se tipan por completitud del
 * contrato — igual que `fecha_limite` en `CreatePickingPayload`, el
 * formulario actual no los captura.
 */
export interface CreatePackingPayload {
  picking: number;
  numero_cajas?: number;
  peso_total?: string;
  volumen_total?: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  observaciones?: string;
  packing_detalle: CreatePackingDetalleLine[];
}
