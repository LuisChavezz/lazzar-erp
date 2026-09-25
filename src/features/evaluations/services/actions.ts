import { v1_api } from "@/src/api/v1.api";
import type { Evaluation, EvaluationCreate } from "../interfaces/evaluation.interface";

/** Arreglo plano, sin paginación, ordenado por `-fecha`. El detalle tiene la misma forma. */
export const getEvaluations = async (): Promise<Evaluation[]> => {
  const { data } = await v1_api.get<Evaluation[]>("/hr/evaluaciones/");
  return data;
};

export const createEvaluation = async (evaluation: EvaluationCreate): Promise<Evaluation> => {
  const { data } = await v1_api.post<Evaluation>("/hr/evaluaciones/", evaluation);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que en
 * el resto de catálogos de RH.
 */
export const updateEvaluation = async (
  id: number,
  evaluation: EvaluationCreate
): Promise<Evaluation> => {
  const { data } = await v1_api.patch<Evaluation>(`/hr/evaluaciones/${id}/`, evaluation);
  return data;
};

/** Borrado FÍSICO: el modelo no tiene `activo`, la fila desaparece. */
export const deleteEvaluation = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/evaluaciones/${id}/`);
};
