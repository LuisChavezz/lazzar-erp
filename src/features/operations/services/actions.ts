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

// Estos dos endpoints operan directamente sobre el recurso Cotizacion,
// no sobre mesa-control, por eso usan /ventas/cotizaciones/{id}/... en
// vez de /ventas/mesa-control/{id}/... como el resto de las funciones
// de este archivo. Confirmado correcto — no es una inconsistencia.
export const acceptChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/cotizaciones/${id}/aceptar-cambios/`
  );
  return response.data;
};

export const rejectChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuoteActionResponse> => {
  const response = await v1_api.post<OperationsQuoteActionResponse>(
    `/ventas/cotizaciones/${id}/rechazar-cambios/`
  );
  return response.data;
};
