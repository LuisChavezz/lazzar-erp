import { v1_api } from "@/src/api/v1.api";
import type {
  Productivity,
  ProductivityCreate,
  ProductivityWrite,
} from "../interfaces/productivity.interface";
import type { EstadoProductividad } from "../constants/productivityChoices";

const BASE = "/hr/productividad/";

/** Arreglo plano, sin paginación, ordenado por `-fecha`. El detalle tiene la misma forma. */
export const getProductivityRecords = async (): Promise<Productivity[]> => {
  const { data } = await v1_api.get<Productivity[]>(BASE);
  return data;
};

/** Un registro leído del SERVIDOR, sin caché (guarda previa a escribir). */
export const getProductivityRecord = async (id: number): Promise<Productivity> => {
  const { data } = await v1_api.get<Productivity>(`${BASE}${id}/`);
  return data;
};

export const createProductivityRecord = async (
  record: ProductivityCreate
): Promise<Productivity> => {
  const { data } = await v1_api.post<Productivity>(BASE, record);
  return data;
};

/** Edición parcial: PATCH, nunca PUT. Solo sobre registros en borrador. */
export const updateProductivityRecord = async (
  id: number,
  record: ProductivityWrite
): Promise<Productivity> => {
  const { data } = await v1_api.patch<Productivity>(`${BASE}${id}/`, record);
  return data;
};

/**
 * Confirmar o devolver a borrador: `PATCH {estado}`. No hay acción propia en
 * el backend, que tampoco valida la transición.
 */
export const updateProductivityEstado = async (
  id: number,
  estado: EstadoProductividad
): Promise<Productivity> => {
  const { data } = await v1_api.patch<Productivity>(`${BASE}${id}/`, { estado });
  return data;
};

/** Borrado FÍSICO: el modelo no tiene `activo`, la fila desaparece. */
export const deleteProductivityRecord = async (id: number): Promise<void> => {
  await v1_api.delete(`${BASE}${id}/`);
};
