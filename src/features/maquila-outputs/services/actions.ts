import { v1_api } from "@/src/api/v1.api";
import type {
  CreateSalidaMaquilaBody,
  OpParaSalidaMaquila,
  SalidaMaquila,
  SalidaMaquilaFilters,
  SalidaMaquilaListItem,
} from "../interfaces/salida-maquila.interface";

const BASE = "/produccion/salidas-maquila/";

/** Arreglo plano, sin paginar, más reciente primero. Acotado a las sucursales del usuario. */
export const getSalidasMaquila = async (params: SalidaMaquilaFilters = {}): Promise<SalidaMaquilaListItem[]> => {
  const response = await v1_api.get<SalidaMaquilaListItem[]>(BASE, { params });
  return response.data;
};

export const getSalidaMaquila = async (id: number): Promise<SalidaMaquila> => {
  const response = await v1_api.get<SalidaMaquila>(`${BASE}${id}/`);
  return response.data;
};

export const createSalidaMaquila = async (body: CreateSalidaMaquilaBody): Promise<SalidaMaquila> => {
  const response = await v1_api.post<SalidaMaquila>(BASE, body);
  return response.data;
};

export const cancelarSalidaMaquila = async (id: number): Promise<SalidaMaquila> => {
  const response = await v1_api.post<SalidaMaquila>(`${BASE}${id}/cancelar/`);
  return response.data;
};

export const getOpParaSalidaMaquila = async (opId: number): Promise<OpParaSalidaMaquila> => {
  const response = await v1_api.get<OpParaSalidaMaquila>(`/produccion/orden-produccion/${opId}/`);
  return response.data;
};
