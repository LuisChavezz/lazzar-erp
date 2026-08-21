/**
 * Contratos del endpoint de onboarding de picking
 * (`GET /wms/pickings/onboarding/`).
 *
 * El endpoint tiene DOS modos según el query param opcional `?pedido`:
 *
 *  - SIN `?pedido` → devuelve solo los selectores para armar el encabezado
 *    (`pedidos`/`operadores`/`almacenes`), con `pedido: null` y
 *    `picking_detalle: []`. Los `pedidos` ya vienen filtrados por el backend a
 *    `activo=True` y `estatus ∈ [3, 4]` (AUTORIZADA / EN PROCESO), acotados a
 *    la empresa y sucursales del usuario — por eso el frontend NO replica ese
 *    filtro de estatus (no existe mapeo de esos códigos en este repo).
 *
 *  - CON `?pedido={id}` → los mismos selectores MÁS `pedido` (el elegido) y
 *    `picking_detalle`: una fila POR TALLA del pedido con el pendiente real
 *    calculado sobre TODOS los pickings no cancelados de ese pedido. Estos
 *    pendientes cambian con el tiempo (otro operador/otra pestaña puede surtir
 *    entre que se carga el formulario y se envía), así que NO deben cachearse
 *    por mucho (ver `usePickingOnboarding`).
 *
 * Todas las cantidades viajan como STRING decimal (mismo criterio que el resto
 * de importes/cantidades del contrato). Los nombres de campo se conservan en
 * español tal cual el API.
 */

/** Pedido candidato a surtir (o el pedido elegido). */
export interface PickingOnboardingPedido {
  id: number;
  folio: string;
  cliente: number;
  cliente_nombre: string | null;
  sucursal: number;
  sucursal_nombre: string | null;
}

/**
 * Operador disponible para asignarse al picking — selector visible del Paso 1
 * (ver `PickingWizardStep1`). El usuario autenticado se preselecciona por
 * conveniencia si aparece en esta lista, pero el campo sigue siendo editable:
 * cualquier operador de la lista puede elegirse.
 */
export interface PickingOnboardingOperador {
  id: number;
  nombre: string;
}

/**
 * Almacén disponible, acotado a la empresa/sucursales del usuario.
 *
 * Es la forma MÍNIMA (cuatro campos): la que el backend usa para los
 * singletons sugeridos `almacen_origen`/`almacen_destino` (`serializar_almacen`).
 * Las LISTAS de selector traen además los flags de operación — ver
 * `PickingOnboardingAlmacenOpcion`.
 */
export interface PickingOnboardingAlmacen {
  id: number;
  codigo: string;
  nombre: string;
  /**
   * NULLABLE: es el `sucursal_id` del catálogo, y `Almacen.sucursal` se declara
   * `null=True, blank=True`. Un almacén sin sucursal es de ALCANCE EMPRESA y el
   * backend lo acepta como destino de cualquier pedido (solo compara sucursales
   * cuando el almacén trae una), así que quien filtre por sucursal debe dejarlo
   * pasar en vez de descartarlo — ver `destinoOptions` en `PickingWizardStep1`.
   */
  sucursal: number | null;
}

/**
 * Entrada de las listas de almacenes del onboarding
 * (`almacenes` / `almacenes_origen` / `almacenes_destino`).
 *
 * Añade los flags del catálogo con los que el backend arma los subconjuntos y
 * que además VUELVE A VALIDAR en el `POST` (un origen sin `permite_salida` o
 * un destino sin `permite_entrada` son un 400 con clave de campo). Se tipa
 * aparte de `PickingOnboardingAlmacen` porque los singletons sugeridos NO los
 * traen: darlos por presentes ahí sería mentirle al tipo.
 */
export interface PickingOnboardingAlmacenOpcion extends PickingOnboardingAlmacen {
  tipo_almacen: string | null;
  permite_entrada: boolean;
  permite_salida: boolean;
  permite_transferencia: boolean;
}

/**
 * KPIs de surtido del pedido elegido (`header.tracker`).
 *
 * Todos viajan como STRING decimal (los porcentajes con 4 decimales, ya en
 * escala 0–100). Cuando el onboarding se pide SIN `?pedido`, el backend
 * devuelve el mismo objeto con ceros en lugar de omitirlo.
 *
 * Ningún componente lo consume todavía; se tipa para no perder la forma del
 * contrato ahora que el backend lo publica.
 */
export interface PickingOnboardingTracker {
  pct_asignado_pedido: string;
  pct_surtido_pedido: string;
  total_prendas_pedido: string;
  total_asignado: string;
  total_surtido: string;
}

/**
 * Encabezado sugerido del onboarding. `fecha_picking_sugerida` y
 * `folio_sugerido_preview` solo vienen poblados con `?pedido`; sin él llegan
 * en `null` (el esqueleto `armar_payload_vacio` del backend conserva el mismo
 * shape a propósito, para que el frontend no dependa de si hubo sugerencia).
 */
export interface PickingOnboardingHeader {
  fecha_picking_sugerida: string | null;
  folio_sugerido_preview: string | null;
  tracker: PickingOnboardingTracker;
}

/**
 * Fila por talla del pedido elegido — el "estado de la verdad" de lo que aún
 * se puede surtir. `cantidad_pendiente = cantidad_pedida - cantidad_ya_asignada`
 * (clampada a 0). El backend devuelve TODAS las tallas del pedido, incluidas
 * las que ya no tienen pendiente (`cantidad_pendiente === "0"`), que la UI
 * muestra deshabilitadas en lugar de ocultarlas.
 */
export interface PickingOnboardingTalla {
  pedido_detalle: number;
  pedido_detalle_talla: number;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  cantidad_pedida: string;
  cantidad_ya_asignada: string;
  cantidad_ya_surtida: string;
  cantidad_pendiente: string;
  /**
   * Existencia FÍSICA del par (producto, variante) en el almacén origen,
   * sumada a través de TODAS las ubicaciones del almacén (no de un solo
   * renglón de `Existencia`).
   */
  existencia_fisica: string;
  /**
   * Parte de la física bloqueada por reservas de inventario ACTIVAS.
   *
   * Ya NO crece con cada picking: crear uno dejó de generar reservas, así que
   * hoy solo suma filas históricas (las que quedaron activas antes de ese
   * cambio). Sigue restándose de `existencia_disponible`, por lo que no se
   * puede ignorar, pero no debe describirse al usuario como algo que "otros
   * pickings están apartando ahora".
   */
  existencia_reservada: string;
  /**
   * `existencia_fisica - existencia_reservada` (acotado a 0): lo que de verdad
   * se puede tomar hoy del almacén origen. Es un concepto de STOCK FÍSICO,
   * independiente de `cantidad_pendiente` (que es de cantidades del PEDIDO) —
   * puede ser menor que el pendiente, y ese es justo el caso que la UI acota.
   */
  existencia_disponible: string;
  /**
   * `min(cantidad_pendiente, existencia_disponible)`, acotado a 0 — el techo
   * que el backend ANUNCIA y que su propio `POST` vuelve a validar con el
   * mismo helper (`ExistenciaService.get_existencia_batch`), así que los dos
   * números son el mismo por construcción.
   *
   * OJO: solo es de fiar si el backend resolvió como almacén origen el MISMO
   * que viajará en el `POST`. Sin `?almacen_origen=` el backend elige un
   * candidato por su cuenta (el de menor pk de la sucursal, excluyendo
   * APARTADOS), que puede no ser ese — ver `almacen_origen` en
   * `PickingOnboardingData` y la comprobación en `usePickingStep2Form`.
   */
  maximo_picking_permitido: string;
}

/**
 * Respuesta completa del onboarding. `pedido`/`picking_detalle` solo vienen
 * poblados cuando se llamó con `?pedido={id}`; en el modo "solo selectores"
 * son `null`/`[]`.
 */
export interface PickingOnboardingData {
  pedidos: PickingOnboardingPedido[];
  operadores: PickingOnboardingOperador[];
  /**
   * Catálogo COMPLETO de almacenes. El backend lo conserva por compatibilidad,
   * pero para poblar un selector hay que usar `almacenes_origen` /
   * `almacenes_destino`: esta lista incluye almacenes que el `POST` rechaza.
   */
  almacenes: PickingOnboardingAlmacenOpcion[];
  /** Subconjunto de `almacenes` con `permite_salida` — candidatos a ORIGEN. */
  almacenes_origen: PickingOnboardingAlmacenOpcion[];
  /**
   * Subconjunto de `almacenes` con `permite_entrada` — candidatos a DESTINO,
   * que es lo que puebla el selector del Paso 1.
   *
   * OJO con dos cosas que el subconjunto NO garantiza y el `POST` sí valida:
   * está acotado a las sucursales del USUARIO (no a la del pedido), y puede
   * contener el almacén origen. Por eso el Paso 1 lo filtra otra vez antes de
   * ofrecerlo (ver `PickingWizardStep1`).
   *
   * Además, si el catálogo trae los flags apagados el backend devuelve aquí la
   * lista COMPLETA como fallback para no bloquear al operador: la presencia de
   * un almacén en esta lista no prueba que tenga `permite_entrada`.
   */
  almacenes_destino: PickingOnboardingAlmacenOpcion[];
  /** Encabezado sugerido + KPIs de surtido del pedido. */
  header: PickingOnboardingHeader;
  /**
   * Almacén ORIGEN contra el que el backend calculó `existencia_*` de cada
   * talla. Eco del `?almacen_origen=` enviado; si no se envía (o el usuario no
   * tiene acceso a ese almacén), el backend elige un candidato por su cuenta y
   * lo devuelve aquí. Comparar este id contra el almacén que viajará en el
   * `POST` es la ÚNICA forma de saber si las existencias anunciadas describen
   * el mismo almacén que se validará al enviar.
   */
  almacen_origen: PickingOnboardingAlmacen | null;
  /**
   * Almacén DESTINO SUGERIDO por el backend (el `APARTADOS` de la empresa/
   * sucursal del pedido, si existe). Es solo una sugerencia: desde `picking v2`
   * el destino lo elige el usuario en el Paso 1 y viaja explícito en el `POST`.
   * Puede llegar `null` cuando no hay un `APARTADOS` configurado.
   */
  almacen_destino: PickingOnboardingAlmacen | null;
  pedido: PickingOnboardingPedido | null;
  picking_detalle: PickingOnboardingTalla[];
}
