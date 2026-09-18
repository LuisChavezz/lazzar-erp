import { z } from "zod";
import { ESTADO_CONTRATO_VALUES, TIPO_CONTRATO_VALUES } from "../constants/contractChoices";

/**
 * Objeto base SIN el `refine` cruzado.
 *
 * Se exporta aparte porque `validateForm` valida el objeto completo mientras
 * que `validateField` (en blur) necesita el schema de UN campo vía `.shape`, y
 * un `.refine` de objeto ya no expone `.shape`. Mismo desdoblamiento que en
 * turnos.
 *
 * `empleado` usa 0 como centinela de "Seleccionar..." y el schema lo rechaza:
 * es un FK OBLIGATORIO.
 */
const ContractFormObject = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  tipo: z.enum(TIPO_CONTRATO_VALUES, "El tipo de contrato es requerido"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
  fecha_fin: z.string(),
  // Decimal(10,2) como string, igual que `salario_base` en puestos, pero aquí
  // OBLIGATORIO: la cadena vacía no pasa.
  salario: z
    .string()
    .regex(/^\d{1,8}(\.\d{1,2})?$/, "Salario inválido (máximo 8 enteros y 2 decimales)"),
  estado: z.enum(ESTADO_CONTRATO_VALUES, "El estado es requerido"),
  archivo_url: z.string().max(255, "La referencia no puede exceder 255 caracteres"),
  observaciones: z.string(),
  prestaciones: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const ContractFormFields = ContractFormObject.shape;

/**
 * Regla cruzada de fechas como función pura: la usan el `refine` de abajo y
 * `useContractForm`, que la reevalúa al cambiar `fecha_inicio` para limpiar el
 * error que el `refine` deja bajo `fecha_fin`.
 *
 * Las fechas llegan como `"YYYY-MM-DD"` de `<input type="date">`, cuyo orden
 * lexicográfico coincide con el cronológico. Si alguna está vacía la regla no
 * se dispara: `fecha_fin` es opcional y el vacío de `fecha_inicio` ya tiene su
 * propio mensaje.
 */
export const isFechaRangeValid = (fechaInicio: string, fechaFin: string) =>
  !fechaInicio || !fechaFin || fechaFin >= fechaInicio;

export const FECHA_RANGE_MESSAGE = "La fecha de fin no puede ser anterior a la de inicio";

/**
 * `fecha_fin` no puede ser anterior a `fecha_inicio`. El backend ya responde
 * 400 por esto; se valida aquí para no descubrirlo con un viaje de red.
 */
export const ContractFormSchema = ContractFormObject.refine(
  (values) => isFechaRangeValid(values.fecha_inicio, values.fecha_fin),
  {
    message: FECHA_RANGE_MESSAGE,
    // Sin `path` el issue quedaría a nivel de objeto y `validateForm` —que lee
    // `issue.path[0]`— lo descartaría: el formulario no enviaría y no diría
    // por qué.
    path: ["fecha_fin"],
  }
);

export type ContractFormValues = z.infer<typeof ContractFormSchema>;
