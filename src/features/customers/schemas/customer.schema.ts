import { z } from "zod";

const optionalEmailSchema = z.union([z.string().email("Correo inválido"), z.literal("")]);

/**
 * Decimal(14,2) del backend: no negativo, hasta 12 enteros y 2 decimales. El
 * backend acepta negativos (defecto conocido), así que el piso se impone aquí.
 * Vacío equivale a 0 (ver `normalizeOptionalCustomerFields`).
 */
const LIMITE_CREDITO_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

/** Tope de `PositiveIntegerField`. */
const DIAS_CREDITO_MAX = 2147483647;

export const CustomerFormSchema = z.object({
  razon_social: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  telefono: z.string().optional(),
  correo: optionalEmailSchema.optional(),
  rfc: z.string().min(1, "Requerido"),
  direccion_fiscal: z.string().min(1, "Requerido"),
  colonia: z.string().min(1, "Requerido"),
  codigo_postal: z.string().min(1, "Requerido"),
  ciudad: z.string().min(1, "Requerido"),
  estado: z.string().min(1, "Requerido"),
  sat_regimen_fiscal: z.number().int().min(1, "Requerido"),
  sat_uso_cfdi: z.number().int().min(1, "Requerido"),
  dias_credito: z
    .number({ message: "Debe ser un número entero" })
    .int("Debe ser un número entero, sin decimales")
    .min(0, "No puede ser negativo")
    .max(DIAS_CREDITO_MAX, "El valor es demasiado grande"),
  limite_credito: z
    .string()
    .trim()
    .refine((value) => !value.startsWith("-"), "No puede ser negativo")
    .refine(
      (value) => value === "" || value.startsWith("-") || LIMITE_CREDITO_PATTERN.test(value),
      "Debe ser un importe de hasta 12 enteros y 2 decimales"
    ),
});

export type CustomerFormValues = z.output<typeof CustomerFormSchema>;
