import { z } from "zod";

/**
 * Renglón del detalle (`orden_produccion_detalle`): una variante de producto a
 * fabricar con su cantidad, unidad de medida y observaciones. El backend
 * resuelve la lista de materiales (BOM) automáticamente a partir de
 * `producto_variante_id`.
 */
export const CreateProductionOrderDetalleSchema = z.object({
  producto_variante_id: z.number().int().positive(),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  unidad: z.number().int().positive("Selecciona una unidad"),
  observaciones: z.string(),
});

/**
 * Cuerpo completo para crear una orden de producción
 * (`POST /produccion/orden-produccion/onboarding/`).
 *
 * `estatus_op` viaja fijo en `1` (estatus inicial "creada"). `empresa` y
 * `sucursal` provienen del workspace activo. El detalle por variante
 * (cantidad, unidad y observaciones) se configura en el Paso 2.
 */
export const CreateProductionOrderFormSchema = z.object({
  empresa: z.number().int().positive("La empresa es requerida"),
  sucursal: z.number().int().positive("La sucursal es requerida"),
  estatus_op: z.number().int().positive(),
  prioridad: z.number().int().positive("La prioridad es requerida"),
  observaciones: z.string(),
  orden_produccion_detalle: z
    .array(CreateProductionOrderDetalleSchema)
    .min(1, "Agrega al menos un producto"),
});

export type CreateProductionOrderDetalleValues = z.infer<
  typeof CreateProductionOrderDetalleSchema
>;

export type CreateProductionOrderFormValues = z.infer<
  typeof CreateProductionOrderFormSchema
>;
