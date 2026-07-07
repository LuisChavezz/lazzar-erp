import { v1_api } from "@/src/api/v1.api";
import { OperationsQuote } from "../interfaces/operations-quote.interface";
import { OperationsQuoteStockDetail } from "../interfaces/operations-quote-stock-detail.interface";


export const getOperationsQuotes = async (): Promise<OperationsQuote[]> => {
  const response = await v1_api.get<OperationsQuote[]>("/ventas/mesa-control/");
  return response.data;
};

export const getOperationsQuoteStockDetails = async (
  id: number
): Promise<OperationsQuoteStockDetail[]> => {
  const response = await v1_api.get<OperationsQuoteStockDetail[]>(
    `/ventas/mesa-control/${id}/stock-detalle/`
  );
  return response.data;
};

export const approveOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/mesa-control/${id}/autorizar/`
  );
  return response.data;
};

export const rejectOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/mesa-control/${id}/rechazar/`
  );
  return response.data;
};

// Estos dos endpoints operan directamente sobre el recurso Cotizacion,
// no sobre mesa-control, por eso usan /ventas/cotizaciones/{id}/... en
// vez de /ventas/mesa-control/{id}/... como el resto de las funciones
// de este archivo. Confirmado correcto — no es una inconsistencia.
export const acceptChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/cotizaciones/${id}/aceptar-cambios/`
  );
  return response.data;
};

export const rejectChangesOperationsQuote = async (
  id: number
): Promise<OperationsQuote> => {
  const response = await v1_api.post<OperationsQuote>(
    `/ventas/cotizaciones/${id}/rechazar-cambios/`
  );
  return response.data;
};
