import { z } from "zod";

/**
 * Schema para el formulario de edición de una orden de compra.
 *
 * A diferencia de {@link PurchaseOrderEncabezadosSchema} (onboarding), que anida
 * los campos bajo `orden_compra` porque el POST de creación recibe ese
 * envoltorio, la edición usa una forma **plana** que mapea 1:1 con
 * `UpdatePurchaseOrderHeader` (`PUT /compras/ordenes/{pk}/`). Los `detalles` se
 * agregan después, en el Step 2, al armar el body completo.
 *
 * El tipo de salida (`z.infer`) es asignable a `UpdatePurchaseOrderHeader`.
 */
export const PurchaseOrderEditSchema = z.object({
  sucursal: z
    .number({ message: "La sucursal es requerida" })
    .min(1, "La sucursal es requerida"),
  proveedor: z
    .number({ message: "El proveedor es requerido" })
    .min(1, "El proveedor es requerido"),
  moneda: z
    .number({ message: "La moneda es requerida" })
    .min(1, "La moneda es requerida"),
  fecha_oc: z.string().min(1, "La fecha de la orden es requerida"),
  referencia: z.string().min(1, "La referencia es requerida"),
  observaciones: z.string().default(""),
});

export type PurchaseOrderEditFormValues = z.infer<typeof PurchaseOrderEditSchema>;
