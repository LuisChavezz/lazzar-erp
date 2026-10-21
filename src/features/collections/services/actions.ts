import { v1_api } from "@/src/api/v1.api";
import { centavosAMoneda, sumImportesEnCentavos } from "@/src/utils/sumImportesEnCentavos";
import { normalizeCapturedDecimal } from "@/src/utils/decimal";
import type {
  Cobro,
  CobroEstatus,
  CreateCobroDetallePayload,
  CreateCobroPayload,
  FinanceDashboard,
  FinanceDashboardParams,
} from "../interfaces/collection.interface";
import type { CobroFormValues } from "../schemas/createCobro.schema";

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
 * Retrieve de UN cobro (`GET /finanzas/cobros/{id}/`). Misma forma que cada
 * elemento del listado (`CobroSerializer`). Un cobro inactivo o de otra empresa
 * responde 404.
 */
export const getCobro = async (id: number): Promise<Cobro> => {
  const { data } = await v1_api.get<Cobro>(`/finanzas/cobros/${id}/`);
  return data;
};

/**
 * Timbra el complemento de pago (REP) del cobro ante el SAT vía Facturama
 * (`POST /finanzas/cobros/{id}/timbrar-rep/`). El endpoint no lee el cuerpo:
 * va vacío. Responde el cobro completo con `rep_uuid` y demás `rep_*`; los
 * errores de negocio llegan como `{ rep: [...] }` (ver `stampCobroRepErrorMessage`).
 */
export const stampCobroRep = async (id: number): Promise<Cobro> => {
  const { data } = await v1_api.post<Cobro>(`/finanzas/cobros/${id}/timbrar-rep/`);
  return data;
};

/**
 * Cancela el cobro (`POST /finanzas/cobros/{id}/cancelar/`, sin cuerpo).
 * Responde el cobro completo (`CobroSerializer`). Un `Aplicado` revierte saldos
 * de CxC, banco y póliza; un `Borrador` solo cambia de estatus; uno ya
 * `Cancelado` responde 200 sin hacer nada. Con REP (`rep_uuid` o
 * `rep_pendiente`) responde 400 `{ rep: [...] }`.
 */
export const cancelCobro = async (id: number): Promise<Cobro> => {
  const { data } = await v1_api.post<Cobro>(`/finanzas/cobros/${id}/cancelar/`);
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

/**
 * Alta de un cobro con sus líneas anidadas. El error se deja propagar tal cual
 * para que `useCreateCobro` lo normalice y lo reparta entre cabecera y líneas.
 */
export const createCobro = async (payload: CreateCobroPayload): Promise<Cobro> => {
  const { data } = await v1_api.post<Cobro>("/finanzas/cobros/", payload);
  return data;
};

/**
 * Valores del formulario → cuerpo exacto de `POST /finanzas/cobros/`.
 *
 * - `estatus` llega por parámetro y viaja SIEMPRE explícito: hoy el alta solo
 *   manda `"Aplicado"`; los borradores (EC-548) reutilizarán esta función.
 * - `total_cobrado` se DERIVA de las líneas en centavos enteros: el cuadre
 *   `|suma − total| <= 0.01` del backend se cumple por construcción.
 * - `fecha_cobro` se OMITE si va vacía (el campo no es nullable; el backend
 *   aplica su default); el resto de opcionales vacíos viajan como `null`.
 * - `referencia_operacion` va en mayúsculas (convención de finanzas).
 * - Nunca incluye `moneda` ni los datos que la línea arrastra solo para la vista
 *   (`saldo`, `moneda_codigo`, `factura_folio`).
 */
export function buildCobroPayload(values: CobroFormValues, estatus: CobroEstatus): CreateCobroPayload {
  const optional = (raw: string, uppercase = false): string | null => {
    const trimmed = uppercase ? raw.trim().toUpperCase() : raw.trim();
    return trimmed ? trimmed : null;
  };

  const cobro_detalles: CreateCobroDetallePayload[] = values.cobro_detalles.map((line) => ({
    cxc: line.cxc,
    importe_aplicado: Number(normalizeCapturedDecimal(line.importe_aplicado)).toFixed(2),
    observaciones: optional(line.observaciones),
  }));

  const payload: CreateCobroPayload = {
    cliente: values.cliente,
    cuenta_bancaria: values.cuenta_bancaria,
    metodo_pago: values.metodo_pago,
    referencia: values.referencia,
    referencia_operacion: optional(values.referencia_operacion, true),
    total_cobrado: centavosAMoneda(sumImportesEnCentavos(values.cobro_detalles)),
    estatus,
    observaciones: optional(values.observaciones),
    cobro_detalles,
  };

  const fechaCobro = values.fecha_cobro.trim();
  if (fechaCobro.length > 0) payload.fecha_cobro = fechaCobro;

  return payload;
}
