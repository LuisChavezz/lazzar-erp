import { z } from "zod";
import { formatShortDate, isValidDateKey, parseLocalDate } from "@/src/utils/formatDate";
import { createFechaVencimientoSchema } from "./purchase-order-fecha-vencimiento.schema";

/**
 * Schema para el formulario de edición de una orden de compra.
 *
 * A diferencia de {@link PurchaseOrderEncabezadosSchema} (onboarding), que anida
 * los campos bajo `orden_compra` porque el POST de creación recibe ese
 * envoltorio, la edición usa una forma **plana** que mapea 1:1 con
 * `UpdatePurchaseOrderHeader` (`PUT /compras/ordenes/{pk}/`). Los `detalles` se
 * agregan después, en el Step 2, al armar el body completo.
 *
 * - `fecha_oc` NO viaja: la fija el servidor al crear la orden (es la "fecha de
 *   generación") y el PUT la ignora. El formulario solo la muestra.
 * - `fecha_vencimiento` viaja SIEMPRE, como "yyyy-mm-dd" o `null` (vaciar el
 *   campo borra la fecha guardada). En la forma plana el backend no valida el
 *   encabezado, así que la garantía de formato vive en este schema (ver
 *   `createFechaVencimientoSchema`).
 *
 * Es una FACTORÍA porque la fecha de vencimiento no puede ser anterior a la
 * fecha de generación de ESTA orden (`fechaGeneracion`, su `fecha_oc`), no a
 * hoy: una orden con vencimiento ya pasado debe poder seguir editándose. Si
 * `fechaGeneracion` no es un día válido, la regla se omite.
 *
 * La regla solo se aplica cuando el valor CAMBIA respecto del guardado
 * (`fechaVencimientoGuardada`): una orden que ya trae un vencimiento anterior a
 * su generación (el desfase UTC del alta, el admin de Django, datos viejos) debe
 * poder editarse sin obligar a tocar esa fecha. Cambiarla a otra fecha anterior
 * sí se rechaza.
 *
 * El tipo de salida (`z.output`) es asignable a `UpdatePurchaseOrderHeader`.
 */
export const createPurchaseOrderEditSchema = (
  fechaGeneracion: string,
  fechaVencimientoGuardada: string,
) => {
  const minDate = isValidDateKey(fechaGeneracion) ? fechaGeneracion : null;

  return z.object({
    sucursal: z
      .number({ message: "La sucursal es requerida" })
      .min(1, "La sucursal es requerida"),
    proveedor: z
      .number({ message: "El proveedor es requerido" })
      .min(1, "El proveedor es requerido"),
    moneda: z
      .number({ message: "La moneda es requerida" })
      .min(1, "La moneda es requerida"),
    fecha_vencimiento: createFechaVencimientoSchema(
      (value) => (value === fechaVencimientoGuardada ? null : minDate),
      `La fecha de vencimiento no puede ser anterior a la fecha de generación (${formatShortDate(parseLocalDate(minDate))})`,
    ),
    referencia: z.string().min(1, "La referencia es requerida"),
    observaciones: z.string().default(""),
  });
};

type PurchaseOrderEditSchema = ReturnType<typeof createPurchaseOrderEditSchema>;

/**
 * Valores del formulario (entrada del schema): `fecha_vencimiento` es el texto
 * crudo del `<input type="date">` (`""` = sin fecha).
 */
export type PurchaseOrderEditFormValues = z.input<PurchaseOrderEditSchema>;

/** Encabezado validado (salida del schema): `fecha_vencimiento` ya es `string | null`. */
export type PurchaseOrderEditHeader = z.output<PurchaseOrderEditSchema>;
