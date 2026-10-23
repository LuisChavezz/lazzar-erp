import { z } from "zod";
import { MONEY_REGEX } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { getCodigoPostalError } from "@/src/utils/codigoPostal";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import { optionalEmailSchema } from "@/src/utils/optionalEmailSchema";
import { telefonoSchema } from "@/src/utils/telefonoSchema";

/**
 * Tope de negocio. El backend suma estos días a la fecha de hoy para el
 * vencimiento de una factura sin fecha, así que el tope del entero del modelo
 * dejaría pasar valores que desbordan una fecha.
 */
export const DIAS_CREDITO_MAX = 365;

/** Decimal(14,2) del backend: 12 dígitos enteros como máximo. */
const LIMITE_CREDITO_MAX_ENTEROS = 12;

const CustomerFormObject = z.object({
  razon_social: z.string().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  telefono: telefonoSchema.optional(),
  correo: optionalEmailSchema.optional(),
  rfc: z.string().min(1, "Requerido"),
  direccion_fiscal: z.string().min(1, "Requerido"),
  colonia: z.string().min(1, "Requerido"),
  codigo_postal: z.string().min(1, "Requerido"),
  ciudad: z.string().min(1, "Requerido"),
  estado: z.string().min(1, "Requerido"),
  sat_regimen_fiscal: z.number().int().min(1, "Requerido"),
  sat_uso_cfdi: z.number().int().min(1, "Requerido"),
  // Ambos se capturan como TEXTO (ver `CustomerForm`) y vacío equivale a 0. Los
  // días llegan sin sanear y el límite conserva su `-` inicial, para que estas
  // reglas rechacen con su mensaje lo que no cumple en vez de cambiarlo; el
  // backend también rechaza negativos (`dias_credito` es entero positivo hasta
  // 365 y `limite_credito` tiene mínimo 0).
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
      const normalized = normalizeCapturedDecimal(value);
      return normalized === "" || MONEY_REGEX.test(normalized);
    }, "Debe ser un importe no negativo con hasta 2 decimales")
    .refine(
      (value) => normalizeCapturedDecimal(value).split(".")[0].length <= LIMITE_CREDITO_MAX_ENTEROS,
      `No puede tener más de ${LIMITE_CREDITO_MAX_ENTEROS} dígitos enteros`
    ),
});

/** Esquema de cada campo, para validar en blur: el esquema completo ya no expone `.shape`. */
export const CustomerFormFields = CustomerFormObject.shape;

/**
 * El CP depende del RFC capturado en el MISMO formulario: el extranjero
 * (`XEXX010101000`) no exige los 5 dígitos, igual que el backend al guardar.
 */
export const getCustomerCodigoPostalError = (
  values: Pick<CustomerFormValues, "codigo_postal" | "rfc">
): string | null => getCodigoPostalError(values.codigo_postal, values.rfc);

export const CustomerFormSchema = CustomerFormObject.superRefine((values, ctx) => {
  const codigoPostalError = getCustomerCodigoPostalError(values);
  if (codigoPostalError) {
    ctx.addIssue({ code: "custom", message: codigoPostalError, path: ["codigo_postal"] });
  }
});

export type CustomerFormValues = z.output<typeof CustomerFormObject>;
