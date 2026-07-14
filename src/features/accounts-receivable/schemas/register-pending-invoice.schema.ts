import { z } from "zod";

/**
 * Esquema del formulario "Registrar Factura Pendiente por Cobrar"
 * (`POST /finanzas/facturas/registrar-pendiente-cobro/`).
 *
 * Los montos viajan como strings decimales (misma convención que el resto de
 * campos de dinero del proyecto — ver `product-variant.schema.ts`). `cliente` y
 * `moneda` parten de `0` en el formulario, por lo que `.min(1)` funciona como el
 * guard de "elige una opción". `pedido` es opcional (`0` = sin pedido).
 *
 * La comparación cruzada `total === subtotal − descuento + impuestos` se hace en
 * centavos enteros (no en flotantes) para evitar errores de redondeo binario.
 */

// Acepta enteros o decimales con máximo 2 posiciones ("1000" o "1000.00").
// Se exporta para que el diálogo reutilice la misma fuente de verdad en su guía
// de "total esperado" (evita una copia del patrón que pueda desincronizarse).
export const MONEY_REGEX = /^\d+(\.\d{1,2})?$/;
const MONEY_MESSAGE = "Monto inválido (usa hasta 2 decimales)";

/** Convierte un string monetario a centavos enteros para comparaciones exactas. */
export const toCents = (value: string): number => Math.round(Number(value) * 100);

/** Campo de dinero requerido: string no vacío, formato válido y mayor a 0. */
const requiredMoney = (requiredMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .regex(MONEY_REGEX, MONEY_MESSAGE)
    .refine((v) => Number(v) >= 0.01, "El monto debe ser mayor a 0");

/**
 * Campo de dinero opcional con valor por defecto `"0.00"`: una cadena vacía se
 * normaliza a `"0.00"` (el backend usa ese mismo default para `descuento` e
 * `impuestos`).
 */
const optionalMoney = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? "0.00" : v),
  z.string().regex(MONEY_REGEX, MONEY_MESSAGE),
);

const RegisterPendingInvoiceObject = z.object({
  cliente: z.number().int().min(1, "Selecciona un cliente"),
  moneda: z.number().int().min(1, "Selecciona una moneda"),
  // `0` = sin pedido; cualquier otro valor debe ser un entero positivo.
  pedido: z.number().int().min(0),
  folio: z.string(),
  fecha_vencimiento: z.string(),
  subtotal: requiredMoney("El subtotal es requerido"),
  descuento: optionalMoney,
  impuestos: optionalMoney,
  total: requiredMoney("El total es requerido"),
  referencia: z.string(),
  observaciones: z.string(),
});

export const RegisterPendingInvoiceSchema = RegisterPendingInvoiceObject.refine(
  (data) => {
    // Si algún monto no pasa el formato, deja que el error de campo se muestre
    // primero — no se dispara un error de "total" espurio sobre valores NaN.
    const values = [data.subtotal, data.descuento, data.impuestos, data.total];
    if (values.some((v) => !MONEY_REGEX.test(v))) return true;

    const expected = toCents(data.subtotal) - toCents(data.descuento) + toCents(data.impuestos);
    return expected === toCents(data.total);
  },
  {
    message: "El total debe ser igual a subtotal − descuento + impuestos",
    path: ["total"],
  },
);

export type RegisterPendingInvoiceFormValues = z.infer<typeof RegisterPendingInvoiceSchema>;

/**
 * Nombres de los campos del formulario, derivados del `shape` del propio
 * esquema. Si se agrega/quita/renombra un campo en `RegisterPendingInvoiceObject`
 * esta lista se actualiza sola —no hay lista escrita a mano que pueda
 * desincronizarse—. La consume `useRegisterPendingInvoice` para decidir qué
 * llaves de un `400` mapear a un campo del formulario.
 */
export const REGISTER_PENDING_INVOICE_FIELDS = Object.keys(
  RegisterPendingInvoiceObject.shape,
) as (keyof RegisterPendingInvoiceFormValues)[];
