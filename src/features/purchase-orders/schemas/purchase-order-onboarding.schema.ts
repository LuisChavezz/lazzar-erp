import { z } from "zod";
import { getLocalTodayDate } from "@/src/utils/formatDate";
import { createFechaVencimientoSchema } from "./purchase-order-fecha-vencimiento.schema";

/**
 * Encabezado del alta (`POST /compras/ordenes/onboarding/`, anidado bajo
 * `orden_compra`). `fecha_oc` ya no se captura: el servidor la fija con la
 * fecha del día al crear la orden (es la "fecha de generación") y descarta
 * cualquier valor que mande el cliente.
 */
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
    // La orden nace hoy (fecha local del navegador): vencer antes no tiene sentido.
    fecha_vencimiento: createFechaVencimientoSchema(
      getLocalTodayDate,
      "La fecha de vencimiento no puede ser anterior a hoy",
    ),
    referencia: z.string().min(1, "La referencia es requerida"),
    observaciones: z.string().default(""),
  }),
});

/**
 * Valores del formulario (entrada del schema): `fecha_vencimiento` es el texto
 * crudo del `<input type="date">` (`""` = sin fecha). La salida validada es
 * `PurchaseOrderEncabezados`, con `null` en su lugar.
 */
export type PurchaseOrderEncabezadosFormValues = z.input<
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
