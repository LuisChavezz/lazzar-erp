import type { StaleEstadoRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { Evaluation } from "../interfaces/evaluation.interface";
import type { EvaluationRow } from "../components/EvaluationColumns";
import {
  getEstadoEvaluacionLabel,
  getPeriodoEvaluacionLabel,
  getTipoEvaluacionLabel,
  type EstadoEvaluacion,
} from "../constants/evaluationChoices";
import { catalogText } from "@/src/utils/catalogText";

/**
 * Filas de la tabla: cada evaluación con los nombres de sus dos FK resueltos
 * contra el MISMO catálogo de empleados. Un id que no está en el catálogo (o
 * cuyo catálogo no ha llegado) se rotula `Empleado #N`; sin evaluador
 * (`null`), "Sin evaluador". Una sola vez: la celda, la búsqueda, el orden y
 * las opciones de filtro leen ese mismo texto (ver `EvaluationRow`).
 */
export const buildEvaluationRows = (
  evaluations: readonly Evaluation[],
  employeeNameById: ReadonlyMap<number, string>,
): EvaluationRow[] => {
  const employeeName = (id: number) => employeeNameById.get(id) ?? `Empleado #${id}`;
  return evaluations.map((evaluation) => ({
    ...evaluation,
    empleado_nombre: employeeName(evaluation.empleado),
    evaluador_nombre:
      evaluation.evaluador === null ? "Sin evaluador" : employeeName(evaluation.evaluador),
  }));
};

/**
 * Texto de cada catálogo en la celda (y en la búsqueda y el orden): la
 * etiqueta o, si el backend manda un código que el catálogo no conoce, el
 * código crudo — el mismo texto que rotula su opción de filtro. "—" sin valor.
 */
export const getEvaluationTipoText = (tipo: string | null | undefined): string =>
  catalogText(getTipoEvaluacionLabel(tipo), tipo);

export const getEvaluationPeriodoText = (periodo: string | null | undefined): string =>
  catalogText(getPeriodoEvaluacionLabel(periodo), periodo);

export const getEvaluationEstadoText = (estado: string | null | undefined): string =>
  catalogText(getEstadoEvaluacionLabel(estado), estado);

/**
 * Avisos del diálogo de eliminar que se cerró por un cambio externo: la
 * evaluación ya no existe, o ya no está pendiente (una completada no se
 * elimina).
 */
export const EVALUATION_STALE_MESSAGES: StaleEstadoRowDialogMessages<EstadoEvaluacion> = {
  gone: "La evaluación ya no existe. Se actualizó el listado.",
  estadoChanged: (estado) =>
    `La evaluación cambió de estado: ya está ${getEvaluationEstadoText(estado).toLowerCase()} y no se puede eliminar. Se actualizó el listado.`,
};
