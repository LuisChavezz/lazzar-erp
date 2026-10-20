import { v1_api } from "@/src/api/v1.api";
import type {
  Cobro,
  FinanceDashboard,
  FinanceDashboardParams,
} from "../interfaces/collection.interface";

/**
 * Lista los cobros desde `GET /finanzas/cobros/`.
 *
 * Va SIN parámetros a propósito: el endpoint acepta filtros de servidor
 * (`cliente`, `metodo_pago`, `estatus`, `cuenta_bancaria`, `referencia`, rango
 * de `fecha_cobro`) y `ordering`, pero `DataTable` busca y filtra en memoria
 * sobre el arreglo completo. `ordering` además se aplica DESPUÉS del orden
 * propio y pisa su desempate por `-id`. Se trae la lista entera —el backend ya
 * la acota por empresa— y una sola entrada de caché sirve a toda la pantalla.
 */
export const getCobros = async (): Promise<Cobro[]> => {
  const { data } = await v1_api.get<Cobro[]>("/finanzas/cobros/");
  return data;
};

/**
 * Indicadores de finanzas: `GET /finanzas/dashboard/`, para el período por
 * defecto del backend (mes en curso hasta hoy) y UNA moneda.
 */
export const getFinanceDashboard = async (
  params: FinanceDashboardParams,
): Promise<FinanceDashboard> => {
  const { data } = await v1_api.get<FinanceDashboard>("/finanzas/dashboard/", { params });
  return data;
};
