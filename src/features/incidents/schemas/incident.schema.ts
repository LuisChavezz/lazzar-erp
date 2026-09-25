import { z } from "zod";
import { getLocalTodayDate } from "@/src/utils/formatDate";
import {
  ESTADO_INCIDENCIA_VALUES,
  ESTADO_QUE_EXIGE_ACCIONES,
  GRAVEDAD_INCIDENCIA_VALUES,
  TIPO_INCIDENCIA_VALUES,
} from "../constants/incidentChoices";

export const FECHA_FUTURA_MESSAGE = "La fecha no puede ser posterior a hoy";

/**
 * `fecha` no puede ser futura. Se compara como `"YYYY-MM-DD"` contra el HOY
 * LOCAL (`getLocalTodayDate`, no `toISOString`, que en México ya es mañana a
 * partir de las 18:00): el orden lexicográfico de ese formato coincide con el
 * cronológico. Se evalúa al validar, no al cargar el módulo, para que un
 * formulario abierto al cruzar la medianoche use el día vigente.
 *
 * Es una regla de UN campo, así que vive en el objeto base y el blur de
 * `fecha` la evalúa vía `.shape`.
 */
export const isFechaNoFutura = (fecha: string) => !fecha || fecha <= getLocalTodayDate();

/**
 * Objeto base SIN la regla cruzada.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un refinamiento de objeto ya no expone `.shape`. Mismo desdoblamiento que en
 * capacitaciones.
 *
 * `empleado` usa 0 como centinela de "Seleccionar..." y el schema lo rechaza:
 * es un FK OBLIGATORIO.
 *
 * `acciones_tomadas` es `z.string()` a secas: su obligatoriedad depende de
 * `estado` y vive en el refinamiento (ver `getAccionesTomadasError`).
 */
const IncidentFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  tipo: z.enum(TIPO_INCIDENCIA_VALUES, "El tipo es requerido"),
  gravedad: z.enum(GRAVEDAD_INCIDENCIA_VALUES, "La gravedad es requerida"),
  estado: z.enum(ESTADO_INCIDENCIA_VALUES, "El estado es requerido"),
  fecha: z
    .string()
    .min(1, "La fecha es requerida")
    .refine(isFechaNoFutura, FECHA_FUTURA_MESSAGE),
  descripcion: z.string(),
  acciones_tomadas: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const IncidentFormFields = IncidentFormObject.shape;

export const ACCIONES_TOMADAS_MESSAGE =
  "Describe las acciones tomadas para cerrar la incidencia";

/**
 * Regla cruzada como función pura: `acciones_tomadas` es obligatoria (no vacía
 * tras recortar) cuando la incidencia está "cerrada", y opcional mientras está
 * "abierta". La usan el refinamiento de abajo y `useIncidentForm`, que la
 * reevalúa al cambiar `estado` (el otro campo de la regla).
 */
export const getAccionesTomadasError = (estado: string, accionesTomadas: string) =>
  estado === ESTADO_QUE_EXIGE_ACCIONES && !accionesTomadas.trim()
    ? ACCIONES_TOMADAS_MESSAGE
    : null;

/**
 * El issue lleva `path`: sin él quedaría a nivel de objeto y `validateForm`
 * —que lee `issue.path[0]`— lo descartaría, y el formulario no enviaría sin
 * decir por qué.
 */
export const IncidentFormSchema = IncidentFormObject.superRefine((values, ctx) => {
  const accionesError = getAccionesTomadasError(values.estado, values.acciones_tomadas);
  if (accionesError) {
    ctx.addIssue({ code: "custom", message: accionesError, path: ["acciones_tomadas"] });
  }
});

export type IncidentFormValues = z.infer<typeof IncidentFormSchema>;
