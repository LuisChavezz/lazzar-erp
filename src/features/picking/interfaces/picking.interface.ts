/**
 * Contratos del endpoint de picking (`/wms/pickings/`).
 *
 * `GET` (listado) y `GET .../{id}/` (detalle) devuelven la MISMA forma
 * (`Picking`, con `picking_detalle` incluido en ambos) — a diferencia de
 * traspasos, que sí separa listado/detalle en dos tipos distintos. Por eso el
 * diálogo de detalle de picking no hace ningún fetch propio: reutiliza el
 * objeto ya cargado por el listado (ver `PickingDetailDialog`).
 *
 * `POST` crea un picking PARCIAL a partir de un `CreatePickingPayload`: el
 * frontend envía, por talla, la cantidad real a surtir en esta entrega
 * (`picking_detalle`), validada por el backend contra lo que aún queda
 * pendiente. Un mismo pedido acumula varios pickings a lo largo del tiempo —
 * ya no existe el límite de "un picking por pedido".
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
 * Valores de `prioridad`, tanto al CREAR como al LEER un picking: el backend
 * lo declara como un solo `TextChoices` (`Picking.Prioridad`) serializado con
 * `fields = "__all__"`, así que viaja como string plano —no como objeto
 * `{value,label}`— en el listado y en el detalle.
 */
export type PickingPrioridad = "BAJA" | "MEDIA" | "ALTA";

/** Valores de `tipo`. Mismo criterio que `PickingPrioridad`: string plano. */
export type PickingTipo =
  | "ORDER_PICKING"
  | "BATCH_PICKING"
  | "WAVE_PICKING"
  | "ZONE_PICKING";

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
 *
 * `pedido_detalle_talla`/`talla_id`/`talla_nombre` los añadió el backend junto
 * al nuevo flujo parcial: identifican la talla concreta surtida en la línea
 * (además del producto/variante, que siguen presentes). `talla_nombre` se
 * muestra en el diálogo de detalle.
 */
export interface PickingDetalleLine {
  id: number;
  pedido_detalle: number | null;
  pedido_detalle_talla: number | null;
  talla_id: number | null;
  talla_nombre: string | null;
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

/** Tipos de orden de trabajo que un picking puede generar. */
export type PickingOrdenTrabajoTipo = "BORDADO" | "REFLEJANTE" | "CORTE_MANGA";

/**
 * Vínculo entre un picking y una orden de trabajo generada al crearlo, tal
 * cual viaja embebido en `Picking.ordenes_trabajo` (listado y detalle).
 *
 * Los tres pares `orden_*`/`orden_*_folio` son excluyentes: solo el que
 * corresponde a `tipo_orden` viaja con valor, los otros dos en `null`.
 * `tipo_orden_label` es la etiqueta humana que ya resuelve el backend
 * (p. ej. `"Bordado"`) — el frontend no necesita su propio mapa.
 */
export interface PickingOrdenTrabajo {
  id: number;
  tipo_orden: PickingOrdenTrabajoTipo;
  tipo_orden_label: string;
  orden_bordado: number | null;
  orden_bordado_folio: string | null;
  orden_reflejante: number | null;
  orden_reflejante_folio: string | null;
  orden_corte_manga: number | null;
  orden_corte_manga_folio: string | null;
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
  /** Almacén ORIGEN: de donde se recolecta la mercancía. */
  almacen: number;
  almacen_nombre: string;
  /**
   * Almacén DESTINO del picking, distinto del origen y COEXISTE con él: es el
   * almacén de apartados al que se traspasa lo surtido. Cuando el `POST` omite
   * `almacen_destino`, el backend resuelve por nombre el almacén `"APARTADOS"`
   * de la empresa/sucursal del pedido y lo guarda
   * (`PickingService._resolve_apartados`), por eso en la práctica
   * `almacen_destino_nombre` casi siempre llega como `"APARTADOS"`.
   *
   * Nullable en el modelo (`blank=True, null=True`) aunque el flujo actual
   * siempre lo llene: los pickings anteriores a la migración `0011` podrían
   * traerlo vacío.
   */
  almacen_destino: number | null;
  almacen_destino_nombre: string | null;
  oleada: number | null;
  oleada_nombre: string | null;
  zona_almacen: number | null;
  zona_almacen_nombre: string | null;
  lote: number | null;
  lote_nombre: string | null;
  prioridad: PickingPrioridad;
  tipo: PickingTipo;
  estado: PickingEstado;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  /**
   * Fecha límite de surtido. Es un `date-time` completo (no un `YYYY-MM-DD`
   * como la `fecha_vencimiento` de CxC), así que "vencido" se compara contra el
   * instante actual, no contra la medianoche del día — ver `isPickingVencido`.
   */
  fecha_limite: string | null;
  // OJO: con el flujo parcial, `total_lineas`/`total_lineas_completas`
  // describen SOLO las líneas de ESTE picking (esta entrega), no el avance del
  // pedido completo. Para el avance de un pedido habría que sumar sobre todos
  // sus pickings. La columna "Avance" y el KPI del listado los leen por
  // registro individual, que sigue siendo internamente consistente.
  total_lineas: number;
  total_lineas_completas: number;
  observaciones: string | null;
  usuario: number;
  usuario_nombre: string;
  created_at: string;
  updated_at: string;
  picking_detalle: PickingDetalleLine[];
  /**
   * Órdenes de trabajo (bordado / reflejante / corte de manga) generadas al
   * crear el picking. El backend las anida y prefetchea tanto en el listado
   * como en el detalle; llega `[]` cuando el picking no generó ninguna.
   */
  ordenes_trabajo: PickingOrdenTrabajo[];
}

/**
 * Fila de la tabla de picking: el registro del backend más los campos
 * DERIVADOS en cliente que consumen las columnas y los filtros.
 *
 * `esta_vencida` se deriva de `fecha_limite` porque el backend NO expone
 * ninguna bandera de vencimiento calculada (verificado contra el schema
 * OpenAPI del API: el componente `Picking` no declara nada equivalente).
 * Mismo patrón que `CuentaPorCobrarRow` en cuentas por cobrar, donde el
 * vencimiento también se deriva por fecha en el cliente.
 */
export interface PickingRow extends Picking {
  esta_vencida: boolean;
}

/**
 * Una línea del `picking_detalle` a surtir en esta entrega.
 *
 * `cantidad_asignada` es la cantidad PARCIAL a surtir ahora para esa talla
 * (string decimal, mínimo 0.0001 en el backend), validada contra lo pendiente.
 * `observaciones` es opcional por línea.
 */
export interface CreatePickingDetalleLine {
  pedido_detalle_talla: number;
  cantidad_asignada: string;
  observaciones?: string;
}

/**
 * Cuerpo de `POST /wms/pickings/` (idéntico a `POST .../onboarding/`).
 *
 * `operador` SÍ viaja en el payload (el backend lo requiere), pero no es un
 * campo del formulario: se deriva del usuario autenticado y se adjunta al
 * armar el payload (ver `usePickingStep2Form`), nunca capturado ni mostrado en
 * la UI. `almacen` tampoco es un campo del formulario: siempre viaja como el
 * id fijo del almacén "Producto Terminado" (`PRODUCTO_TERMINADO_ALMACEN_ID`
 * en `usePickingStep2Form`), confirmado estable en todos los ambientes.
 * `empresa`, `sucursal`, `folio` y `usuario` los resuelve el backend, por eso
 * NO forman parte de este tipo. `estado` ya no se acepta al crear (siempre
 * arranca en "Pendiente"): si se enviara, el backend lo ignora.
 *
 * `oleada`/`zona_almacen`/`lote`/`fecha_*` son campos de cabecera opcionales
 * del contrato; el formulario actual no los captura pero se tipan por
 * completitud para futuras iteraciones.
 */
export interface CreatePickingPayload {
  pedido: number;
  operador: number;
  almacen: number;
  prioridad: PickingPrioridad;
  tipo: PickingTipo;
  observaciones?: string;
  oleada?: number | null;
  zona_almacen?: number | null;
  lote?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  fecha_limite?: string | null;
  picking_detalle: CreatePickingDetalleLine[];
}
