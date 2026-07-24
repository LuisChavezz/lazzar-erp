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

/** Almacén disponible, acotado a la empresa/sucursales del usuario. */
export interface PickingOnboardingAlmacen {
  id: number;
  codigo: string;
  nombre: string;
  sucursal: number;
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
}

/**
 * Respuesta completa del onboarding. `pedido`/`picking_detalle` solo vienen
 * poblados cuando se llamó con `?pedido={id}`; en el modo "solo selectores"
 * son `null`/`[]`.
 */
export interface PickingOnboardingData {
  pedidos: PickingOnboardingPedido[];
  operadores: PickingOnboardingOperador[];
  almacenes: PickingOnboardingAlmacen[];
  pedido: PickingOnboardingPedido | null;
  picking_detalle: PickingOnboardingTalla[];
}
