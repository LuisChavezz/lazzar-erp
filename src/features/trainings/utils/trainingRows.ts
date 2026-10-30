import type { StaleRowDialogMessages } from "@/src/utils/staleRowDialogNotice";
import type { Training } from "../interfaces/training.interface";
import type { TrainingRow } from "../components/TrainingColumns";
import { getEstadoCapacitacionLabel } from "../constants/trainingChoices";
import { catalogText } from "@/src/utils/catalogText";

/**
 * Filas de la tabla: cada capacitación con el nombre de su empleado resuelto.
 * Un FK que no está en el catálogo (o cuyo catálogo no ha llegado) se rotula
 * `Empleado #N`, una sola vez: la celda, la búsqueda, el orden y la opción del
 * filtro de encabezado leen ese mismo texto (ver `TrainingRow`).
 */
export const buildTrainingRows = (
  trainings: readonly Training[],
  employeeNameById: ReadonlyMap<number, string>,
): TrainingRow[] =>
  trainings.map((training) => ({
    ...training,
    empleado_nombre: employeeNameById.get(training.empleado) ?? `Empleado #${training.empleado}`,
  }));

/**
 * Texto del `estado` para la búsqueda global: la etiqueta del catálogo o el
 * código crudo, lo mismo que pinta su badge y que rotula su opción de filtro.
 */
export const getTrainingEstadoText = (estado: string | null | undefined): string =>
  catalogText(getEstadoCapacitacionLabel(estado), estado);

/**
 * Aviso del diálogo de eliminar que se cerró porque la capacitación ya no
 * está. Sin `activoChanged`: la capacitación no tiene baja lógica (el DELETE
 * es físico), así que solo cuenta que desaparezca.
 */
export const TRAINING_STALE_MESSAGES: StaleRowDialogMessages = {
  gone: "La capacitación ya no existe. Se actualizó el listado.",
};
