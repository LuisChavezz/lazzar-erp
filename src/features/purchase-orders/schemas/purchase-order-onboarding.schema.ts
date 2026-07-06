import { z } from "zod";

export const PurchaseOrderEncabezadosSchema = z.object({
  orden_compra: z.object({
    sucursal: z
      .number({ message: "La sucursal es requerida" })
      .min(1, "La sucursal es requerida"),
    proveedor: z
      .number({ message: "El proveedor es requerido" })
      .min(1, "El proveedor es requerido"),
    moneda: z
      .number({ message: "La moneda es requerida" })
      .min(1, "La moneda es requerida"),
    fecha_oc: z.string().min(1, "La fecha es requerida"),
    referencia: z.string().min(1, "La referencia es requerida"),
    observaciones: z.string().default(""),
  }),
});

export type PurchaseOrderEncabezadosFormValues = z.infer<
  typeof PurchaseOrderEncabezadosSchema
>;

/**
 * Valida el precio unitario editable de un renglón de producto (Step 2 de
 * alta). El precio viaja como string numérico (mismo formato que
 * `PurchaseOrderDetalleItem.precio`).
 */
export const PurchaseOrderDetallePrecioSchema = z
  .string()
  .refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, {
    message: "El precio debe ser mayor a 0",
  });
