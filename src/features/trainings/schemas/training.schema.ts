import { z } from "zod";
import {
  ESTADO_CAPACITACION_VALUES,
  ESTADO_CON_RESULTADO,
} from "../constants/trainingChoices";

/**
 * Objeto base SIN las reglas cruzadas.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un refinamiento de objeto ya no expone `.shape`. Mismo desdoblamiento que en
 * contratos.
 *
 * `empleado` usa 0 como centinela de "Seleccionar..." y el schema lo rechaza:
 * es un FK OBLIGATORIO.
 *
 * `calificacion` y `constancia_url` son `z.string()` a secas: sus reglas
 * dependen de `estado` y viven en el refinamiento (ver `getCalificacionError` y
 * `getConstanciaUrlError`).
 */
/** Mismo tope que permitía la regex anterior (9 dígitos). */
const HORAS_MAX = 999_999_999;

const TrainingFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(255, "El nombre no puede exceder 255 caracteres"),
  institucion: z.string().max(255, "La institución no puede exceder 255 caracteres"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string(),
  // Vacío = sin dato (viaja como null). Entero positivo, acotado para no
  // desbordar el `PositiveIntegerField` del backend. Se valida PARSEANDO y no
  // con una regex sobre el texto: "08" o "040" son enteros positivos válidos y
  // viajan como 8 y 40 (ver `toNullableInt` en `useTrainingForm`).
  horas: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true;
      }
      const horas = Number(value);
      return Number.isInteger(horas) && horas >= 1 && horas <= HORAS_MAX;
    }, "Las horas deben ser un número entero mayor a 0"),
  estado: z.enum(ESTADO_CAPACITACION_VALUES, "El estado es requerido"),
  calificacion: z.string(),
  constancia_url: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const TrainingFormFields = TrainingFormObject.shape;

/**
 * Regla cruzada de fechas como función pura: la usan el refinamiento de abajo
 * y `useTrainingForm`, que la reevalúa al cambiar `fecha_inicio`.
 *
 * Las fechas llegan como `"YYYY-MM-DD"` de `<input type="date">`, cuyo orden
 * lexicográfico coincide con el cronológico. Si alguna está vacía la regla no
 * se dispara: `fecha_fin` es opcional y el vacío de `fecha_inicio` ya tiene su
 * propio mensaje.
 */
export const isFechaRangeValid = (fechaInicio: string, fechaFin: string) =>
  !fechaInicio || !fechaFin || fechaFin >= fechaInicio;

export const FECHA_RANGE_MESSAGE = "La fecha de fin no puede ser anterior a la de inicio";

export const CALIFICACION_MESSAGE =
  "La calificación debe estar entre 0 y 100, con máximo 2 decimales";

export const CONSTANCIA_URL_MESSAGE = "Ingresa una URL válida (http:// o https://)";

const CONSTANCIA_URL_MAX_MESSAGE = "La URL no puede exceder 255 caracteres";

/** `true` si el texto es una URL absoluta http(s). */
export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Regla de `calificacion`: solo aplica en "Finalizado" y con valor. Escala
 * 0–100 con hasta 2 decimales (Decimal(5,2) en el backend). Fuera de
 * "Finalizado" no hay nada que validar: el campo viaja como `null`.
 */
export const getCalificacionError = (estado: string, calificacion: string) => {
  const value = calificacion.trim();
  if (estado !== ESTADO_CON_RESULTADO || !value) {
    return null;
  }
  return /^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100
    ? null
    : CALIFICACION_MESSAGE;
};

/**
 * Regla de `constancia_url`: solo aplica en "Finalizado" y con valor. El
 * backend la guarda como texto sin validar; aquí se exige una URL http(s) para
 * que el enlace de la tabla sea abrible y seguro.
 */
export const getConstanciaUrlError = (estado: string, constanciaUrl: string) => {
  const value = constanciaUrl.trim();
  if (estado !== ESTADO_CON_RESULTADO || !value) {
    return null;
  }
  if (value.length > 255) {
    return CONSTANCIA_URL_MAX_MESSAGE;
  }
  return isHttpUrl(value) ? null : CONSTANCIA_URL_MESSAGE;
};

/**
 * Reglas cruzadas. Cada issue lleva `path`: sin él quedaría a nivel de objeto y
 * `validateForm` —que lee `issue.path[0]`— lo descartaría, y el formulario no
 * enviaría sin decir por qué.
 */
export const TrainingFormSchema = TrainingFormObject.superRefine((values, ctx) => {
  if (!isFechaRangeValid(values.fecha_inicio, values.fecha_fin)) {
    ctx.addIssue({ code: "custom", message: FECHA_RANGE_MESSAGE, path: ["fecha_fin"] });
  }

  const calificacionError = getCalificacionError(values.estado, values.calificacion);
  if (calificacionError) {
    ctx.addIssue({ code: "custom", message: calificacionError, path: ["calificacion"] });
  }

  const constanciaUrlError = getConstanciaUrlError(values.estado, values.constancia_url);
  if (constanciaUrlError) {
    ctx.addIssue({ code: "custom", message: constanciaUrlError, path: ["constancia_url"] });
  }
});

export type TrainingFormValues = z.infer<typeof TrainingFormSchema>;
