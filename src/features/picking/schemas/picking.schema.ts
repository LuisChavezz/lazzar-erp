import { z } from "zod";

/**
 * Esquema del formulario de captura de picking.
 *
 * Valida los VALORES DEL FORMULARIO — que NO incluyen `operador`: ese campo
 * viaja en el payload de creación (`CreatePickingPayload`) pero se deriva del
 * usuario autenticado al enviar (ver `usePickingForm`), nunca capturado en el
 * formulario. `pedido`/`almacen` usan `0` como centinela de "sin seleccionar"
 * (mismo criterio que el resto de selectores del proyecto, ver
 * `StockTransferForm`).
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

// `prioridad`/`tipo` NO llevan `.default(...)`: `PickingFormSchema` tiene un
// solo llamador (`usePickingForm`), que siempre parte de
// `createEmptyPickingFormValues()` — ambos campos ya vienen poblados desde el
// primer render, así que un default a nivel de schema nunca se activaría.
export const PickingFormSchema = z.object({
  pedido: z.number().int().min(1, "El pedido es requerido"),
  almacen: z.number().int().min(1, "El almacén es requerido"),
  prioridad: z.enum(PICKING_PRIORIDADES),
  tipo: z.enum(PICKING_TIPOS),
  observaciones: z.string(),
});

export type PickingFormValues = z.infer<typeof PickingFormSchema>;

/** Valores iniciales del formulario — sin pedido/almacén elegidos aún. */
export const createEmptyPickingFormValues = (): PickingFormValues => ({
  pedido: 0,
  almacen: 0,
  prioridad: "MEDIA",
  tipo: "ORDER_PICKING",
  observaciones: "",
});
