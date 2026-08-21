import { z } from "zod";

/**
 * Esquemas del asistente de captura de picking PARCIAL.
 *
 * El flujo son dos pasos:
 *  - Paso 1 (encabezado): `PickingHeaderSchema` — pedido, operador, almacén
 *    destino, prioridad, tipo y observaciones. `operador` se elige de la lista
 *    que trae el propio onboarding (ver `PickingWizardStep1`), preseleccionado
 *    con el usuario autenticado por conveniencia cuando aparece en esa lista,
 *    pero editable como cualquier otro selector. `pedido`/`operador`/
 *    `almacen_destino` usan `0` como centinela de "sin seleccionar".
 *
 *    OJO con la asimetría de los dos almacenes: el ORIGEN no es un campo del
 *    formulario (el payload siempre envía el id fijo
 *    `PRODUCTO_TERMINADO_ALMACEN_ID` de `usePickingStep2Form.ts`), mientras que
 *    el DESTINO sí lo es desde `picking v2` — el backend dejó de forzarlo a
 *    APARTADOS y ahora lo valida contra el pedido (misma empresa/sucursal,
 *    distinto del origen, con `permite_entrada`).
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
  operador: z.number().int().min(1, "El operador es requerido"),
  almacen_destino: z.number().int().min(1, "El almacén destino es requerido"),
  prioridad: z.enum(PICKING_PRIORIDADES),
  tipo: z.enum(PICKING_TIPOS),
  observaciones: z.string(),
});

export type PickingHeaderValues = z.infer<typeof PickingHeaderSchema>;

/** Valores iniciales del encabezado — sin pedido/operador/destino elegidos aún. */
export const createEmptyPickingHeaderValues = (): PickingHeaderValues => ({
  pedido: 0,
  operador: 0,
  almacen_destino: 0,
  prioridad: "MEDIA",
  tipo: "ORDER_PICKING",
  observaciones: "",
});
