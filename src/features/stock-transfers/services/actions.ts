import { v1_api } from "@/src/api/v1.api";
import type {
  CreateTransferenciaPayload,
  Transferencia,
  TransferenciaDetail,
  TransferenciaListItem,
} from "../interfaces/stock-transfer.interface";

/**
 * Crea un traspaso almacén→almacén.
 *
 * `POST /wms/transferencias/` — el ViewSet solo implementa `create()`. La
 * operación es atómica: el backend valida la disponibilidad de stock de TODAS
 * las líneas antes de tocar nada; si una falla, rechaza toda la petición (sin
 * estado parcial). El manejo de errores vive en el hook (`useCreateStockTransfer`).
 */
export const createTransferencia = async (
  data: CreateTransferenciaPayload,
): Promise<Transferencia> => {
  const response = await v1_api.post<Transferencia>("/wms/transferencias/", data);
  return response.data;
};

/**
 * Lista los traspasos almacén→almacén (`GET /wms/transferencias/`).
 *
 * Sin paginar (bajo volumen actual) y sin params de filtro documentados — el
 * backend ya acota el resultado a empresa/sucursal del usuario.
 */
export const getTransferencias = async (): Promise<TransferenciaListItem[]> => {
  const response = await v1_api.get<TransferenciaListItem[]>("/wms/transferencias/");
  return response.data;
};

/** Lee el detalle de UN traspaso, con sus líneas (`GET /wms/transferencias/{id}/`). */
export const getTransferenciaDetail = async (id: number): Promise<TransferenciaDetail> => {
  const response = await v1_api.get<TransferenciaDetail>(`/wms/transferencias/${id}/`);
  return response.data;
};

/** Respuesta de `revertir/`: las dos TR en la forma del listado. */
export interface RevertTransferenciaResult {
  /** La TR revertida, ya `CANCELADA`, con `reversa`/`reversa_folio` (EC-949). */
  original: TransferenciaListItem;
  /** La TR inversa nueva (folio propio), con `reversa_de`/`reversa_de_folio`. */
  reversa: TransferenciaListItem;
}

/**
 * Revierte una TR (`POST /wms/transferencias/{id}/revertir/`, #1348 y EC-949):
 * crea la TR inversa y la original queda `CANCELADA`. `201 {original, reversa}`.
 * Las reglas (TR completada, manual o de un surtido ya cancelado, la última de su
 * cadena) las aplica el backend; sin stock en el destino responde `400` con una
 * LISTA plana (`["Inventario insuficiente …"]`), no con un diccionario.
 */
export const revertTransferencia = async ({
  id,
  motivo,
}: {
  id: number;
  motivo: string;
}): Promise<RevertTransferenciaResult> => {
  const response = await v1_api.post<RevertTransferenciaResult>(`/wms/transferencias/${id}/revertir/`, {
    motivo,
  });
  return response.data;
};
