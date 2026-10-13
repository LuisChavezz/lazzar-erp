import { z } from "zod";
import { MONEY_REGEX } from "@/src/features/accounts-receivable/schemas/register-pending-invoice.schema";
import { isCompleteDateEntry } from "@/src/utils/formatDate";
import {
  ETAPA_OPORTUNIDAD_VALUES,
  ETAPA_PERDIDA,
  MONTO_ESTIMADO_MAX_ENTEROS,
  OPORTUNIDAD_MAX_LENGTH,
} from "../constants/opportunityChoices";

const maxLengthMessage = (max: number) => `No puede tener más de ${max} caracteres`;

/** Importe como se envía: sin espacios. `""` equivale a 0 (ver el formulario). */
export const normalizeMontoEstimado = (value: string): string => value.trim();

const OpportunityFormObject = z.object({
  // `null` = sin cliente: la oportunidad vive solo con los datos de contacto.
  cliente: z.number().int().positive("El cliente es inválido").nullable(),
  nombre_contacto: z
    .string()
    .trim()
    .max(OPORTUNIDAD_MAX_LENGTH.nombre_contacto, maxLengthMessage(OPORTUNIDAD_MAX_LENGTH.nombre_contacto)),
  telefono: z
    .string()
    .trim()
    .max(OPORTUNIDAD_MAX_LENGTH.telefono, maxLengthMessage(OPORTUNIDAD_MAX_LENGTH.telefono)),
  correo: z
    .string()
    .trim()
    .max(OPORTUNIDAD_MAX_LENGTH.correo, maxLengthMessage(OPORTUNIDAD_MAX_LENGTH.correo))
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Correo inválido"),
  titulo: z
    .string()
    .trim()
    .max(OPORTUNIDAD_MAX_LENGTH.titulo, maxLengthMessage(OPORTUNIDAD_MAX_LENGTH.titulo)),
  // El backend acepta negativos; aquí no: un importe estimado es >= 0.
  monto_estimado: z
    .string()
    .refine((value) => {
      const normalized = normalizeMontoEstimado(value);
      return normalized === "" || MONEY_REGEX.test(normalized);
    }, "Debe ser un importe no negativo con hasta 2 decimales")
    .refine(
      (value) => normalizeMontoEstimado(value).split(".")[0].length <= MONTO_ESTIMADO_MAX_ENTEROS,
      `No puede tener más de ${MONTO_ESTIMADO_MAX_ENTEROS} dígitos enteros`
    ),
  etapa: z.enum(ETAPA_OPORTUNIDAD_VALUES, { message: "La etapa es inválida" }),
  motivo_perdida: z
    .string()
    .trim()
    .max(OPORTUNIDAD_MAX_LENGTH.motivo_perdida, maxLengthMessage(OPORTUNIDAD_MAX_LENGTH.motivo_perdida)),
  proximo_contacto: z
    .string()
    .refine((value) => value === "" || isCompleteDateEntry(value), "Fecha inválida"),
  notas: z.string(),
});

/** Schemas por campo, para la validación en blur. */
export const OpportunityFormFields = OpportunityFormObject.shape;

export type OpportunityFormValues = z.infer<typeof OpportunityFormObject>;

export interface OpportunityRuleContext {
  /**
   * La oportunidad en edición YA tenía título. El backend rechaza un `""`
   * explícito, así que un título capturado no se puede dejar vacío.
   */
  hadTitulo: boolean;
}

export const MOTIVO_PERDIDA_REQUERIDO_MESSAGE = "Indica por qué se perdió la oportunidad";
export const TITULO_NO_VACIO_MESSAGE =
  "El título no se puede dejar vacío una vez capturado. Escribe uno nuevo.";

/** `motivo_perdida` es obligatorio solo cuando la etapa es `Perdida`. */
export const getMotivoPerdidaError = (
  values: Pick<OpportunityFormValues, "etapa" | "motivo_perdida">
): string | null =>
  values.etapa === ETAPA_PERDIDA && values.motivo_perdida.trim() === ""
    ? MOTIVO_PERDIDA_REQUERIDO_MESSAGE
    : null;

export const IDENTIFICACION_REQUERIDA_MESSAGE =
  "Captura al menos un título, un cliente o un nombre de contacto para identificar la oportunidad.";

/**
 * Pseudo-campo del error de identificación: no es un campo del formulario (el
 * dato puede venir de cualquiera de los tres), así que el formulario lo pinta
 * como aviso junto a ellos.
 */
export const IDENTIFICACION_ERROR_PATH = "identificacion";

/**
 * Una oportunidad sin título, sin cliente y sin contacto no se puede
 * reconocer en el listado. El backend no lo exige; el formulario sí.
 */
export const getIdentificacionError = (
  values: Pick<OpportunityFormValues, "titulo" | "cliente" | "nombre_contacto">
): string | null =>
  values.titulo.trim() === "" && values.cliente === null && values.nombre_contacto.trim() === ""
    ? IDENTIFICACION_REQUERIDA_MESSAGE
    : null;

export const getTituloError = (
  values: Pick<OpportunityFormValues, "titulo">,
  context: OpportunityRuleContext
): string | null =>
  context.hadTitulo && values.titulo.trim() === "" ? TITULO_NO_VACIO_MESSAGE : null;

export const createOpportunityFormSchema = (context: OpportunityRuleContext) =>
  OpportunityFormObject.superRefine((values, ctx) => {
    const motivoError = getMotivoPerdidaError(values);
    if (motivoError) {
      ctx.addIssue({ code: "custom", message: motivoError, path: ["motivo_perdida"] });
    }
    const tituloError = getTituloError(values, context);
    if (tituloError) {
      ctx.addIssue({ code: "custom", message: tituloError, path: ["titulo"] });
    }
    const identificacionError = getIdentificacionError(values);
    if (identificacionError) {
      ctx.addIssue({
        code: "custom",
        message: identificacionError,
        path: [IDENTIFICACION_ERROR_PATH],
      });
    }
  });
