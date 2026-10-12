import { z } from "zod";
import { MONEY_REGEX } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";

const optionalEmailSchema = z.union([z.string().email("Correo inválido"), z.literal("")]);

/**
 * Tope de negocio. El backend suma estos días a la fecha de hoy para el
 * vencimiento de una factura sin fecha, así que el tope del entero del modelo
 * dejaría pasar valores que desbordan una fecha.
 */
export const DIAS_CREDITO_MAX = 365;

/** Decimal(14,2) del backend: 12 dígitos enteros como máximo. */
const LIMITE_CREDITO_MAX_ENTEROS = 12;

/**
 * Forma canónica del límite capturado, la que se valida y se envía: sin punto
 * colgante ("12." → "12") y con el cero inicial que `sanitizeDecimalInput` deja
 * omitir (".5" → "0.5"). Vacío se queda vacío (equivale a 0 al enviar).
 */
export const normalizeLimiteCredito = (value: string): string =>
  stripTrailingDecimalPoint(value.trim()).replace(/^\./, "0.");

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
  // Ambos se capturan como TEXTO saneado (ver `CustomerForm`) y vacío equivale
  // a 0. El backend acepta negativos (defecto conocido): el piso se impone
  // aquí, también para un valor negativo que ya venga guardado.
  dias_credito: z
    .string()
    .refine(
      (value) => value === "" || /^\d+$/.test(value),
      "Debe ser un número entero de días, sin signo ni decimales"
    )
    .refine(
      (value) => !/^\d+$/.test(value) || Number(value) <= DIAS_CREDITO_MAX,
      `Debe estar entre 0 y ${DIAS_CREDITO_MAX} días`
    ),
  limite_credito: z
    .string()
    .refine((value) => {
      const normalized = normalizeLimiteCredito(value);
      return normalized === "" || MONEY_REGEX.test(normalized);
    }, "Debe ser un importe no negativo con hasta 2 decimales")
    .refine(
      (value) => normalizeLimiteCredito(value).split(".")[0].length <= LIMITE_CREDITO_MAX_ENTEROS,
      `No puede tener más de ${LIMITE_CREDITO_MAX_ENTEROS} dígitos enteros`
    ),
});

export type CustomerFormValues = z.output<typeof CustomerFormSchema>;
