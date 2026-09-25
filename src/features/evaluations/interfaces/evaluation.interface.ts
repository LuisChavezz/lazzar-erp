import type {
  EstadoEvaluacion,
  PeriodoEvaluacion,
  TipoEvaluacion,
} from "../constants/evaluationChoices";

/**
 * Evaluación de un empleado.
 *
 * Sin `empresa` ni `activo`: el backend resuelve el tenant a partir de
 * `empleado` (y valida `evaluador` contra el mismo tenant), y el DELETE borra
 * la fila físicamente. Los dos FK llegan como ID crudo, sin nombres: se
 * resuelven en cliente contra el mismo catálogo de empleados.
 */
export interface Evaluation {
  id: number;
  /** FK REQUERIDO a `hr.Empleado`: el evaluado. */
  empleado: number;
  /** FK nullable a `hr.Empleado`: quien evalúa. */
  evaluador: number | null;
  tipo: TipoEvaluacion;
  periodo: PeriodoEvaluacion;
  estado: EstadoEvaluacion;
  /** DateField `"YYYY-MM-DD"`. */
  fecha: string;
  /** Decimal(5,2) como string (`"85.00"`), escala 0–100. Sin validación en el backend. */
  puntaje: string | null;
  /** Texto libre; `""` cuando no se captura. */
  comentarios: string;
}

/**
 * Cuerpo real que se envía al backend en el alta y en la edición (PATCH).
 *
 * `tipo`, `periodo` y `estado` viajan SIEMPRE. `evaluador` es `null` si no se
 * eligió. `puntaje` es `null` fuera de "Completada" (ver `useEvaluationForm`).
 */
export interface EvaluationCreate {
  empleado: number;
  evaluador: number | null;
  tipo: TipoEvaluacion;
  periodo: PeriodoEvaluacion;
  estado: EstadoEvaluacion;
  fecha: string;
  puntaje: string | null;
  comentarios: string;
}

/** Variables de la mutación de edición: el cuerpo más el `id` de la ruta. */
export interface EvaluationPayload extends EvaluationCreate {
  id: number;
}
