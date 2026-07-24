import { z } from "zod";

/**
 * Esquemas del asistente de captura de picking PARCIAL.
 *
 * El flujo son dos pasos:
 *  - Paso 1 (encabezado): `PickingHeaderSchema` — pedido, almacén, operador,
 *    prioridad, tipo y observaciones. `operador` se elige de la lista que trae
 *    el propio onboarding (ver `PickingWizardStep1`), preseleccionado con el
 *    usuario autenticado por conveniencia cuando aparece en esa lista, pero
 *    editable como cualquier otro selector. `pedido`/`almacen`/`operador` usan
 *    `0` como centinela de "sin seleccionar".
 *  - Paso 2 (tallas): las cantidades por talla se guardan como un mapa
 *    `pedido_detalle_talla → cantidad` (string decimal) y se validan contra el
 *    `cantidad_pendiente` real cargado del onboarding en tiempo de envío, no
 *    solo con Zod (el máximo por línea depende de datos del servidor, que
 *    además pueden cambiar entre carga y envío).
 */

export const PICKING_PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;
export type PickingPrioridadForm = (typeof PICKING_PRIORIDADES)[number];

export const PICKING_TIPOS = [
  "ORDER_PICKING",
  "BATCH_PICKING",
  "WAVE_PICKING",
  "ZONE_PICKING",
] as const;
export type PickingTipoForm = (typeof PICKING_TIPOS)[number];

/** Cantidad mínima aceptada por línea en el backend (`min_value=0.0001`). */
export const PICKING_MIN_CANTIDAD = 0.0001;

// `prioridad`/`tipo` NO llevan `.default(...)`: siempre parten de
// `createEmptyPickingHeaderValues()`, así que ya vienen poblados desde el
// primer render y un default a nivel de schema nunca se activaría.
export const PickingHeaderSchema = z.object({
  pedido: z.number().int().min(1, "El pedido es requerido"),
  almacen: z.number().int().min(1, "El almacén es requerido"),
  operador: z.number().int().min(1, "El operador es requerido"),
  prioridad: z.enum(PICKING_PRIORIDADES),
  tipo: z.enum(PICKING_TIPOS),
  observaciones: z.string(),
});

export type PickingHeaderValues = z.infer<typeof PickingHeaderSchema>;

/** Valores iniciales del encabezado — sin pedido/almacén/operador elegidos aún. */
export const createEmptyPickingHeaderValues = (): PickingHeaderValues => ({
  pedido: 0,
  almacen: 0,
  operador: 0,
  prioridad: "MEDIA",
  tipo: "ORDER_PICKING",
  observaciones: "",
});
