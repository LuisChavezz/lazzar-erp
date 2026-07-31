/**
 * Contratos del endpoint REAL de órdenes de bordado
 * (`/produccion/orden-bordado/`).
 *
 * OJO — convivencia temporal: `interfaces/embroidery-order.interface.ts`
 * (vecino de este archivo) declara OTRO tipo llamado `EmbroideryOrder`, el de
 * la maqueta con `@faker-js/faker` que todavía alimenta el KPI "Órdenes de
 * Bordado" de `ManufacturingDashboard`. Son formas COMPLETAMENTE distintas
 * (la maqueta inventa rack, ponchados, validación de arte…; el API real
 * expone 13 campos y ningún nombre resuelto), así que NO se unifican: el
 * archivo mock se retira cuando el dashboard migre a este endpoint. Ningún
 * archivo importa ambos, así que cada `import` elige por ruta sin ambigüedad.
 *
 * Los nombres de campo se conservan en español, tal cual el contrato del API.
 */

/**
 * Estatus de una orden de bordado (`OrdenesBordado.EstatusBordado`, enteros
 * 1-7). En la práctica SIEMPRE llega `1` (Pendiente): el `ViewSet` solo expone
 * `list`/`retrieve`/`create` y `estatus_bordado` es `read_only`, así que no
 * hay endpoint que avance el estado (`PUT`/`PATCH` responden 405). Los 7 se
 * tipan igual, para que empezar a usarlos no requiera tocar el frontend
 * (mismo criterio que `PackingEstado`).
 */
export type EmbroideryOrderStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * Renglón de `detalles`, embebido en cada orden del listado (el backend usa el
 * mismo `OrdenBordadoSerializer` para listado y detalle). Se tipa completo
 * aunque este listado no lo pinte todavía: el diálogo de detalle —tarea
 * siguiente— lo reutiliza tal cual.
 *
 * En las órdenes creadas desde este módulo `posicion_bordado`/`color_nombre`
 * llegan `null` y `colores_hilo`/`puntadas` llegan `0`: nada los captura
 * todavía. `cantidad` es un `FloatField`, o sea un NÚMERO en el JSON (no el
 * string decimal habitual de los campos de inventario).
 */
export interface EmbroideryOrderLine {
  id: number;
  /** FK a la orden de bordado contenedora (`OrdenesBordado.id`). */
  ob: number;
  pedido_detalle: number;
  producto: number;
  producto_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  cantidad: number;
  posicion_bordado: string | null;
  colores_hilo: number;
  puntadas: number;
}

/**
 * Renglón de `GET /produccion/orden-bordado/` (listado).
 *
 * `empresa`, `sucursal` y `usuario_asignado` viajan como ids CRUDOS, sin su
 * `_nombre` resuelto (a diferencia de picking/packing) — no se muestran en la
 * tabla. `fecha_fin` siempre llega `null` (ningún endpoint la fija) y `activo`
 * siempre `true` (el queryset filtra `activo=True`).
 *
 * `folio_bordado` mezcla dos formatos en la misma tabla: `OB-P-00009-2026`
 * (autogenerado al autorizar una cotización) y `2026-OB-00001` (alta manual
 * desde este módulo). Es una definición de negocio pendiente, no un error: se
 * muestra tal cual llega, sin normalizar ni validar.
 */
export interface EmbroideryOrder {
  id: number;
  folio_bordado: string;
  estatus_bordado: EmbroideryOrderStatus;
  /**
   * Entero libre: el modelo lo declara `IntegerField(default=1)` SIN
   * `choices`, así que el backend acepta cualquier entero. La UI rotula 1-3
   * (Alta/Media/Baja, el mismo mapeo que usa el alta de órdenes de
   * producción) y cae a un badge neutro para cualquier otro valor.
   */
  prioridad: number;
  /** `auto_now_add`: es la fecha de ALTA, nunca nula. */
  fecha_inicio: string;
  /** Siempre `null` hoy — ningún endpoint la fija. */
  fecha_fin: string | null;
  observaciones: string | null;
  activo: boolean;
  empresa: number;
  sucursal: number;
  pedido: number;
  /** `Pedido.folio` es nullable: puede llegar `null`. */
  pedido_folio: string | null;
  usuario_asignado: number | null;
  detalles: EmbroideryOrderLine[];
}

// ─── Onboarding / alta ───────────────────────────────────────────────────────

/**
 * Pedido candidato del catálogo (`GET /produccion/orden-bordado/onboarding/`).
 *
 * El backend arma este objeto a mano en la vista (no vía serializer): son
 * pedidos activos, de la empresa del usuario y de sus `sucursales_permitidas`,
 * con AL MENOS una talla marcada `lleva_bordado=True`, ordenados
 * `-created_at, -id`.
 *
 * OJO: el catálogo NO excluye los pedidos que ya tienen una orden de bordado
 * generada — se puede crear una segunda OB sobre el mismo pedido y el backend
 * la acepta. Detectarlo/avisarlo quedó fuera de alcance a propósito.
 *
 * `folio`, `cliente_nombre` y `sucursal_nombre` pueden ser `null`
 * (`Pedido.folio` es nullable y los nombres se leen con `getattr(..., None)`).
 */
export interface EmbroideryOnboardingPedido {
  id: number;
  folio: string | null;
  cliente: number | null;
  cliente_nombre: string | null;
  sucursal: number | null;
  sucursal_nombre: string | null;
}

/**
 * Operador del catálogo: usuarios activos de la empresa. `nombre` ya viene
 * resuelto por el backend (`get_full_name()` y, si queda vacío, el email).
 *
 * Es DECORATIVO: `usuario_asignado` es `read_only` en el serializer y el
 * service lo fija al usuario autenticado (`usuario_asignado=user`) sin mirar
 * el body. Por eso el formulario lo muestra en solo lectura y NO lo envía.
 */
export interface EmbroideryOnboardingOperador {
  id: number;
  nombre: string;
}

/**
 * Respuesta del onboarding.
 *
 * `preview.folio_ob_sugerido` NO se muestra en el formulario a propósito: se
 * calcula con la sucursal POR DEFECTO del usuario, mientras que el folio real
 * se consume con la sucursal DEL PEDIDO (`generate_ob_folio(pedido.empresa_id,
 * pedido.sucursal_id)`), así que puede no coincidir. El folio que se le enseña
 * al usuario es siempre el `folio_bordado` de la respuesta del POST.
 */
export interface EmbroideryOnboardingData {
  pedidos: EmbroideryOnboardingPedido[];
  operadores: EmbroideryOnboardingOperador[];
  preview: { folio_ob_sugerido: string | null };
}

/**
 * Cuerpo de `POST /produccion/orden-bordado/onboarding/`.
 *
 * SOLO estos tres campos. El backend deriva `empresa`/`sucursal` del pedido,
 * `usuario_asignado` del usuario autenticado y `folio_bordado` de la serie de
 * folios; `estatus_bordado`/`activo`/`fecha_inicio` toman su default. Todos
 * ésos son `read_only` (o `auto_now_add`) y se ignoran en silencio si se
 * envían — por eso NO forman parte de este tipo, mismo criterio que
 * `CreatePackingPayload`.
 *
 * `detalles` tampoco se envía: el service los deriva solo, uno por cada
 * `PedidoDetalleTalla` con `lleva_bordado=True` del pedido elegido.
 */
export interface CreateEmbroideryOrderPayload {
  pedido: number;
  prioridad?: number;
  observaciones?: string;
}
