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
 * Sin `estatus_op`: es de solo lectura en el alta (la OP nace Pendiente) y se
 * cambia con `POST .../estatus/`. `empresa` y `sucursal` provienen del
 * workspace activo. El detalle por variante (cantidad, unidad y observaciones)
 * se configura en el Paso 2.
 *
 * `pedido` es opcional: sin pedido el campo queda `undefined`. La clave SÍ
 * puede seguir presente en `parsed.data` (`pedido: undefined`); se omite del
 * request solo porque el body se serializa como JSON, que descarta los
 * `undefined`.
 */
export const CreateProductionOrderFormSchema = z.object({
  empresa: z.number().int().positive("La empresa es requerida"),
  sucursal: z.number().int().positive("La sucursal es requerida"),
  prioridad: z.number().int().positive("La prioridad es requerida"),
  observaciones: z.string(),
  pedido: z.number().int().positive().optional(),
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
