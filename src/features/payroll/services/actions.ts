import { v1_api } from "@/src/api/v1.api";
import type {
  Payroll,
  PayrollCreate,
  PayrollGenerateBody,
  PayrollGenerateResponse,
  PayrollListParams,
  PayrollUpdate,
} from "../interfaces/payroll.interface";
import { ESTADO_CANCELADA, ESTADO_PAGADA } from "../constants/payrollChoices";

const BASE = "/hr/nominas/";

/** Arreglo plano, sin paginación; cada nómina trae sus `detalles`. */
export const getPayrolls = async (params: PayrollListParams): Promise<Payroll[]> => {
  const { data } = await v1_api.get<Payroll[]>(BASE, { params });
  return data;
};

/** Una nómina leída del SERVIDOR, sin caché (guarda previa a escribir). */
export const getPayroll = async (id: number): Promise<Payroll> => {
  const { data } = await v1_api.get<Payroll>(`${BASE}${id}/`);
  return data;
};

export const createPayroll = async (payroll: PayrollCreate): Promise<Payroll> => {
  const { data } = await v1_api.post<Payroll>(BASE, payroll);
  return data;
};

/** PATCH, nunca PUT. `detalles` reemplaza todos los renglones. */
export const updatePayroll = async (id: number, payroll: PayrollUpdate): Promise<Payroll> => {
  const { data } = await v1_api.patch<Payroll>(`${BASE}${id}/`, payroll);
  return data;
};

/** Marcar como pagada: `estado` y `fecha_pago` en un solo PATCH. */
export const payPayroll = async (id: number, fecha_pago: string): Promise<Payroll> => {
  const { data } = await v1_api.patch<Payroll>(`${BASE}${id}/`, {
    estado: ESTADO_PAGADA,
    fecha_pago,
  });
  return data;
};

/** Cancelar: `PATCH {estado}`. No hay eliminar en la interfaz. */
export const cancelPayroll = async (id: number): Promise<Payroll> => {
  const { data } = await v1_api.patch<Payroll>(`${BASE}${id}/`, { estado: ESTADO_CANCELADA });
  return data;
};

/**
 * Genera la quincena de una sucursal: una nómina por empleado ACTIVO. Todo o
 * nada: 409 si alguno ya tiene una pendiente o pagada de ese periodo exacto.
 */
export const generatePayrollPeriod = async (
  body: PayrollGenerateBody
): Promise<PayrollGenerateResponse> => {
  const { data } = await v1_api.post<PayrollGenerateResponse>(`${BASE}generar_periodo/`, body);
  return data;
};
