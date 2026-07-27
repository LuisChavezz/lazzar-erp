/**
 * Contratos del endpoint de onboarding de packing
 * (`GET /wms/packings/onboarding/`).
 *
 * El endpoint tiene DOS modos según el query param opcional `?picking`:
 *
 *  - SIN `?picking` → devuelve solo el catálogo de pickings candidatos
 *    (`pickings`), con `picking: null` y `packing_detalle: []`. El backend
 *    limita el catálogo a 50 resultados, SIN paginar ni filtrar por texto —
 *    por eso el selector del Paso 1 es un buscador en memoria
 *    (`SearchableSelectList`), no un `FormSelect` plano. El catálogo tampoco
 *    excluye los pickings YA completamente empacados: uno sin nada pendiente
 *    sigue apareciendo aquí (solo se descubre al elegirlo y ver
 *    `cantidad_pendiente_empacar: "0.0000"` en todas sus líneas — ver
 *    `PackingWizardStep2`).
 *
 *  - CON `?picking={id}` → los mismos 50 candidatos MÁS `picking` (el
 *    elegido, con el mismo shape del catálogo MÁS `cliente`) y
 *    `packing_detalle`: una fila POR LÍNEA de picking con lo pendiente real
 *    por empacar. Este pendiente puede cambiar entre que se carga el
 *    formulario y se envía (otro operador puede empacar la misma línea antes),
 *    así que no debe cachearse por mucho (ver `usePackingOnboarding`).
 *
 * A diferencia de picking, aquí NO hay `operadores` ni `almacenes` en la
 * respuesta: ambos —y `empresa`/`sucursal`/`pedido`— se heredan del `picking`
 * elegido en el backend; el cliente nunca los selecciona ni los envía.
 *
 * Todas las cantidades viajan como STRING decimal. Los nombres de campo se
 * conservan en español tal cual el API.
 */

/** Picking candidato a empacar, tal cual aparece en el catálogo del Paso 1. */
export interface PackingOnboardingPicking {
  id: number;
  folio: string;
  pedido: number;
  pedido_folio: string | null;
  cliente_nombre: string | null;
  sucursal: number;
  sucursal_nombre: string | null;
  operador: number;
  operador_nombre: string;
  almacen: number;
  almacen_nombre: string | null;
  estado: string;
}

/**
 * El picking elegido (`?picking={id}`) — mismo shape que el catálogo MÁS
 * `cliente` (id), que el catálogo por sí solo no incluye.
 */
export interface PackingOnboardingPickingDetail extends PackingOnboardingPicking {
  cliente: number | null;
}

/**
 * Línea candidata a empacar del picking elegido (una por cada línea de
 * picking no cancelada, tenga o no pendiente). `cantidad_pendiente_empacar =
 * cantidad_asignada - Σ cantidad_empacada` de TODOS los packings previos no
 * cancelados de ese picking — el techo es lo YA ASIGNADO por el picking, NO
 * lo solicitado originalmente ni lo surtido. El backend devuelve TODAS las
 * líneas (incluidas las que ya no tienen pendiente), que la UI muestra
 * deshabilitadas en lugar de ocultarlas — mismo criterio que
 * `PickingOnboardingTalla`.
 *
 * OJO: el backend valida `cantidad_empacada` contra `cantidad_asignada`, NO
 * contra `cantidad_surtida` — es decir, es posible empacar más de lo que el
 * picking marcó como realmente surtido. Es una regla de negocio del backend,
 * no algo que el frontend deba restringir de más; `cantidad_surtida` se
 * muestra aquí solo como contexto informativo (ver `PackingWizardStep2`).
 */
export interface PackingOnboardingLine {
  picking_detalle: number;
  pedido_detalle: number | null;
  pedido_detalle_talla: number | null;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_nombre: string | null;
  talla: number | null;
  talla_nombre: string | null;
  color: number | null;
  color_nombre: string | null;
  ubicacion: number | null;
  ubicacion_nombre: string | null;
  cantidad_solicitada: string;
  cantidad_asignada: string;
  cantidad_surtida: string;
  cantidad_ya_empacada: string;
  cantidad_pendiente_empacar: string;
  estado: string;
}

/**
 * Respuesta completa del onboarding. `picking` solo viene poblado cuando se
 * llamó con `?picking={id}`; en el modo "solo catálogo" es `null` y
 * `packing_detalle` es `[]`.
 */
export interface PackingOnboardingData {
  pickings: PackingOnboardingPicking[];
  picking: PackingOnboardingPickingDetail | null;
  packing_detalle: PackingOnboardingLine[];
}
