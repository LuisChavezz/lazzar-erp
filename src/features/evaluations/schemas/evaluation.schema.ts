import { z } from "zod";
import {
  ESTADO_COMPLETADA,
  ESTADO_EVALUACION_VALUES,
  PERIODO_EVALUACION_VALUES,
  TIPO_EVALUACION_VALUES,
} from "../constants/evaluationChoices";

/**
 * Objeto base SIN las reglas cruzadas.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un refinamiento de objeto ya no expone `.shape`. Mismo desdoblamiento que en
 * incidencias.
 *
 * `empleado` y `evaluador` usan 0 como centinela: en `empleado` es
 * "Seleccionar..." (obligatorio, el schema lo rechaza); en `evaluador` es
 * "Sin evaluador" (válido mientras la evaluación esté pendiente).
 *
 * `evaluador` y `puntaje` no llevan reglas propias aquí: las suyas dependen de
 * otros campos y viven en el refinamiento (ver `getEvaluadorError` y
 * `getPuntajeError`).
 */
const EvaluationFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  evaluador: z.number().int("El evaluador es inválido").min(0, "El evaluador es inválido"),
  tipo: z.enum(TIPO_EVALUACION_VALUES, "El tipo es requerido"),
  periodo: z.enum(PERIODO_EVALUACION_VALUES, "El periodo es requerido"),
  estado: z.enum(ESTADO_EVALUACION_VALUES, "El estado es requerido"),
  fecha: z.string().min(1, "La fecha es requerida"),
  puntaje: z.string(),
  comentarios: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const EvaluationFormFields = EvaluationFormObject.shape;

export const AUTOEVALUACION_MESSAGE = "El evaluador no puede ser el mismo empleado evaluado";
export const EVALUADOR_REQUERIDO_MESSAGE = "El evaluador es requerido para completar la evaluación";
export const PUNTAJE_REQUERIDO_MESSAGE = "El puntaje es requerido para completar la evaluación";
export const PUNTAJE_RANGO_MESSAGE = "El puntaje debe estar entre 0 y 100, con máximo 2 decimales";

/**
 * Reglas de `evaluador` (D4 y D5), como función pura: la usan el refinamiento
 * de abajo y `useEvaluationForm`, que la reevalúa cuando cambian `empleado` o
 * `estado`, los otros dos campos de la regla.
 *
 * - No puede coincidir con el evaluado (autoevaluación bloqueada).
 * - Es opcional mientras la evaluación está pendiente y obligatorio al
 *   completarla.
 */
export const getEvaluadorError = (evaluador: number, empleado: number, estado: string) => {
  if (evaluador > 0 && evaluador === empleado) {
    return AUTOEVALUACION_MESSAGE;
  }
  if (estado === ESTADO_COMPLETADA && evaluador <= 0) {
    return EVALUADOR_REQUERIDO_MESSAGE;
  }
  return null;
};

/**
 * Regla de `puntaje` (D2 y D3): obligatorio y de 0 a 100 con hasta 2 decimales
 * cuando la evaluación está completada. Fuera de ese estado no hay nada que
 * validar: el campo viaja como `null`.
 */
export const getPuntajeError = (puntaje: string, estado: string) => {
  if (estado !== ESTADO_COMPLETADA) {
    return null;
  }
  const value = puntaje.trim();
  if (!value) {
    return PUNTAJE_REQUERIDO_MESSAGE;
  }
  return /^\d{1,3}(\.\d{1,2})?$/.test(value) && Number(value) <= 100
    ? null
    : PUNTAJE_RANGO_MESSAGE;
};

/**
 * Reglas cruzadas. Cada issue lleva `path`: sin él quedaría a nivel de objeto y
 * `validateForm` —que lee `issue.path[0]`— lo descartaría, y el formulario no
 * enviaría sin decir por qué.
 */
export const EvaluationFormSchema = EvaluationFormObject.superRefine((values, ctx) => {
  const evaluadorError = getEvaluadorError(values.evaluador, values.empleado, values.estado);
  if (evaluadorError) {
    ctx.addIssue({ code: "custom", message: evaluadorError, path: ["evaluador"] });
  }

  const puntajeError = getPuntajeError(values.puntaje, values.estado);
  if (puntajeError) {
    ctx.addIssue({ code: "custom", message: puntajeError, path: ["puntaje"] });
  }
});

export type EvaluationFormValues = z.infer<typeof EvaluationFormSchema>;
