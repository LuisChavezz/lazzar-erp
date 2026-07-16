import { v1_api } from "@/src/api/v1.api";
import type {
  CreateTransferenciaPayload,
  Transferencia,
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
