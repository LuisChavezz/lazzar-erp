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
 * Ubicación del bordado dentro de la prenda, tal cual viene en
 * `bordado_config.ubicaciones` de la talla.
 *
 * Sigue siendo JSON LIBRE del pedido —el backend lo reenvía sin normalizar y
 * solo mira `codigo`/`nombre` para derivar `posicion_sugerida`—, pero el shape
 * está confirmado contra datos reales: 42 de 43 tallas con `lleva_bordado` traen
 * exactamente estas 12 claves, y ninguna trae más de una ubicación. De ahí que
 * se cierre el tipo (sin índice abierto) y que TODO campo quede opcional o
 * nullable: es la captura de una cotización, no un contrato del serializer, así
 * que cualquier clave puede faltar o llegar vacía y quien la pinte debe
 * comprobarla antes.
 *
 * `nombre` NO aparece en ningún registro real; se conserva porque el backend lo
 * lee como respaldo de `codigo` al calcular `posicion_sugerida`.
 */
export interface EmbroideryOnboardingUbicacion {
  codigo?: string | null;
  nombre?: string | null;
  descripcion_posicion?: string | null;
  /**
   * URL absoluta al servidor de archivos (`NEXT_PUBLIC_NGROK_BASE_URL`).
   * Es la ÚNICA imagen real del bordado: `EmbroideryOnboardingDetalle.foto`
   * llega `null` en el 100% de los registros porque el extractor del backend la
   * busca en la raíz del config, donde no está.
   */
  imagen?: string | null;
  ancho_cm?: number | null;
  alto_cm?: number | null;
  color_hilo?: string | null;
  pantones?: string | null;
  // Técnicas aplicadas. Se capturan como banderas independientes: una ubicación
  // puede combinar varias, y en los datos actuales todas llegan en `false`.
  dtf?: boolean;
  sublimado?: boolean;
  serigrafia?: boolean;
  revelado?: boolean;
  nuevo_ponchado?: boolean;
}

/**
 * Foto del bordado. El backend busca la primera clave no vacía entre
 * `foto`/`imagen`/`imagen_url`/`foto_url` de `bordado_config` y, si el valor
 * es un string, lo envuelve como `{ url }`; si ya era un objeto, lo reenvía
 * tal cual. De ahí que `url` sea opcional y el índice quede abierto.
 */
export interface EmbroideryOnboardingFoto {
  url?: string;
  [key: string]: unknown;
}

/**
 * Renglón POR TALLA del pedido candidato — el "estado de la verdad" de lo que
 * aún se puede programar a bordado.
 *
 * `cantidad_asignada` es lo ya programado por las OBs activas del pedido y
 * `cantidad_pendiente = cantidad_pedido - cantidad_asignada` (acotado a 0). El
 * backend devuelve TODAS las líneas elegibles del pedido, incluidas las que ya
 * no tienen pendiente (`cantidad_pendiente === 0`), para que la UI pueda
 * mostrarlas agotadas en vez de ocultarlas — mismo criterio que
 * `PickingOnboardingTalla`.
 *
 * Las tres cantidades son NÚMEROS en el JSON (`float`), no el string decimal
 * habitual de inventario: `PedidoDetalleTalla.cantidad` es un
 * `PositiveIntegerField` y las prendas se bordan enteras.
 *
 * `color_id`/`color_nombre` cuelgan del `PedidoDetalle` (no de la talla) y son
 * nullable, igual que `posicion_sugerida`, `foto` y `notas`, que salen de
 * `bordado_config` y pueden no estar capturados. `ubicaciones` siempre es un
 * arreglo, posiblemente vacío.
 */
export interface EmbroideryOnboardingDetalle {
  /** Id de `PedidoDetalleTalla` — el que viaja en `detalles_override`. */
  pedido_detalle_talla_id: number;
  pedido_detalle_id: number;
  producto_id: number;
  producto_nombre: string | null;
  talla_id: number | null;
  talla_nombre: string | null;
  color_id: number | null;
  color_nombre: string | null;
  cantidad_pedido: number;
  cantidad_asignada: number;
  cantidad_pendiente: number;
  posicion_sugerida: string | null;
  ubicaciones: EmbroideryOnboardingUbicacion[];
  foto: EmbroideryOnboardingFoto | null;
  notas: string | null;
}

/**
 * Pedido candidato del catálogo (`GET /produccion/orden-bordado/onboarding/`).
 *
 * El backend arma este objeto a mano en la vista (no vía serializer): son
 * pedidos activos, de la empresa del usuario y de sus `sucursales_permitidas`,
 * con AL MENOS una talla marcada `lleva_bordado=True` y `cantidad > 0`,
 * ordenados `-created_at, -id`.
 *
 * El catálogo se acota por SALDO, no por existencia de OB: un pedido que ya
 * tiene órdenes de bordado sigue apareciendo mientras alguna de sus líneas
 * conserve `cantidad_pendiente > 0`, y desaparece por completo cuando todas
 * quedan en 0. (Antes no se excluía nada; ahora sí — un pedido cubierto al
 * 100% ya no es candidato.)
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
  detalles: EmbroideryOnboardingDetalle[];
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
 * Renglón de `detalles_override` — la línea del pedido que SÍ entra en esta
 * orden, y con cuántas piezas.
 *
 * `pedido_detalle_talla_id` es el `pedido_detalle_talla_id` de
 * `EmbroideryOnboardingDetalle` (o sea, `PedidoDetalleTalla.id`), NO el
 * `pedido_detalle_id`.
 *
 * `cantidad` es un ENTERO de piezas: el serializer rechaza con `400` cualquier
 * fraccionario (`` `cantidad` debe ser un número entero de piezas ``) porque
 * `PedidoDetalleTalla.cantidad` es un `PositiveIntegerField` y los residuos de
 * coma flotante dejaban pendientes de 1e-15 que ninguna OB podía consumir.
 * Viaja como número, no como string decimal.
 *
 * El backend rechaza además: ids repetidos, ids ajenos al `pedido` del body,
 * ids sin `lleva_bordado`, `cantidad <= 0` y `cantidad` mayor a la contratada
 * en el pedido — todos como `400` bajo la clave `detalles_override`.
 */
export interface EmbroideryOrderDetalleOverride {
  pedido_detalle_talla_id: number;
  cantidad: number;
}

/**
 * Cuerpo de `POST /produccion/orden-bordado/onboarding/`.
 *
 * El backend deriva `empresa`/`sucursal` del pedido, `usuario_asignado` del
 * usuario autenticado y `folio_bordado` de la serie de folios;
 * `estatus_bordado`/`activo`/`fecha_inicio` toman su default. Todos ésos son
 * `read_only` (o `auto_now_add`) y se ignoran en silencio si se envían — por
 * eso NO forman parte de este tipo, mismo criterio que `CreatePackingPayload`.
 *
 * `detalles_override` es OPCIONAL y estrictamente aditivo:
 *  - AUSENTE (o vacío) → comportamiento histórico: el service deriva los
 *    renglones solo, uno por cada `PedidoDetalleTalla` con `lleva_bordado=True`
 *    del pedido, al 100% de su cantidad. Es la ruta del alta de un solo paso
 *    que existe hoy. Sobre un pedido ya cubierto al 100% responde `409`.
 *  - PRESENTE → la orden incluye SOLO esas líneas, con esas cantidades. Un
 *    mismo pedido puede acumular varias OB parciales hasta cubrirse (ya no
 *    existe la constraint `uq_orden_bordado_activa_por_pedido`), y por eso
 *    esta ruta NO emite el `409` de duplicado: si algo excede el saldo,
 *    responde `400` con `detalles_exceso`.
 *
 * `detalles` (los renglones ya creados) sigue sin enviarse nunca: es la
 * respuesta, no el cuerpo.
 */
export interface CreateEmbroideryOrderPayload {
  pedido: number;
  prioridad?: number;
  observaciones?: string;
  detalles_override?: EmbroideryOrderDetalleOverride[];
}
