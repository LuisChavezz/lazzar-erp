import { v1_api } from "@/src/api/v1.api";
import type { Training, TrainingCreate } from "../interfaces/training.interface";

/** Arreglo plano, sin paginación. El detalle tiene la misma forma. */
export const getTrainings = async (): Promise<Training[]> => {
  const { data } = await v1_api.get<Training[]>("/hr/capacitaciones/");
  return data;
};

export const createTraining = async (training: TrainingCreate): Promise<Training> => {
  const { data } = await v1_api.post<Training>("/hr/capacitaciones/", training);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que en
 * el resto de catálogos de RH.
 */
export const updateTraining = async (
  id: number,
  training: TrainingCreate
): Promise<Training> => {
  const { data } = await v1_api.patch<Training>(`/hr/capacitaciones/${id}/`, training);
  return data;
};

/** Borrado FÍSICO: el modelo no tiene `activo`, la fila desaparece. */
export const deleteTraining = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/capacitaciones/${id}/`);
};
