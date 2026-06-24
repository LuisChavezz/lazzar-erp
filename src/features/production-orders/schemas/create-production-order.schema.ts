import { z } from "zod";

/**
 * Renglón de detalle de una orden de producción.
 *
 * `bom` y `unidad` usan `0` como centinela de "sin seleccionar" (mismo criterio
 * que el resto de selectores de la app), por lo que se exige un entero positivo.
 */
export const CreateProductionOrderDetalleFormSchema = z.object({
  producto_variante_id: z
    .number()
    .int()
    .positive("La variante de producto es requerida"),
  bom: z.number().int().positive("La lista de materiales es requerida"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.number().int().positive("La unidad es requerida"),
  observaciones: z.string(),
});

/**
 * Cuerpo completo para crear una orden de producción
 * (`POST /produccion/orden-produccion/onboarding/`).
 *
 * `estatus_op` viaja fijo en `1` (estatus inicial "creada") y `ruta_produccion`
 * siempre como `null`: ninguno se edita desde la UI.
 */
export const CreateProductionOrderFormSchema = z.object({
  empresa: z.number().int().positive("La empresa es requerida"),
  sucursal: z.number().int().positive("La sucursal es requerida"),
  pedido: z.number().int().positive().nullable(),
  ruta_produccion: z.null(),
  estatus_op: z.number().int().positive(),
  prioridad: z.number().int().positive("La prioridad es requerida"),
  observaciones: z.string(),
  orden_produccion_detalle: z
    .array(CreateProductionOrderDetalleFormSchema)
    .min(1, "Agrega al menos un producto"),
});

export type CreateProductionOrderDetalleFormValues = z.infer<
  typeof CreateProductionOrderDetalleFormSchema
>;
export type CreateProductionOrderFormValues = z.infer<
  typeof CreateProductionOrderFormSchema
>;
