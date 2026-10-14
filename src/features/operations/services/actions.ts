import { v1_api } from "@/src/api/v1.api";
import {
  OperationsQuote,
  OperationsQuoteActionResponse,
} from "../interfaces/operations-quote.interface";


export const getOperationsQuotes = async (): Promise<OperationsQuote[]> => {
  const response = await v1_api.get<OperationsQuote[]>("/ventas/mesa-control/");
  return response.data;
};

export const approveOperationsQuote = async (
  id: number
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/mesa-control/${id}/autorizar/`
  );
  return response.data;
};

/**
 * `comentario` es OBLIGATORIO en el backend (vacío o solo espacios → 400
 * `{comentario}`) y queda como `motivo_rechazo` y como entrada `RECHAZO` del
 * historial. El backend lo recorta; no tiene longitud máxima.
 */
export const rejectOperationsQuote = async (
  id: number,
  comentario: string
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/mesa-control/${id}/rechazar/`,
    { comentario }
  );
  return response.data;
};

// Aceptar/rechazar cambios van por /ventas/mesa-control/{id}/..., como el
// resto de este archivo. La acción es la misma en /ventas/cotizaciones/
// (`MesaControlViewSet` la hereda) y ambas exigen mesa de control, pero ese
// recurso acota a las cotizaciones del propio VENDEDOR para quien no es admin
// de empresa: un usuario de mesa de control no admin recibía 404. El de
// mesa-control acota por empresa y estatus [2, 5], que incluye el 5.
export const acceptChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/mesa-control/${id}/aceptar-cambios/`
  );
  return response.data;
};

export const rejectChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/mesa-control/${id}/rechazar-cambios/`
  );
  return response.data;
};
