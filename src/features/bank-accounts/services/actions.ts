import { v1_api } from "@/src/api/v1.api";
import type {
  CuentaBancaria,
  CuentaBancariaCreate,
  ResumenCuentaBancaria,
} from "../interfaces/bank-account.interface";

/**
 * Listado completo de cuentas bancarias.
 *
 * Devuelve un ARREGLO PLANO, sin envoltorio de paginación. El backend ya acota
 * los resultados a la empresa del usuario autenticado.
 */
export const getBankAccounts = async (): Promise<CuentaBancaria[]> => {
  const { data } = await v1_api.get<CuentaBancaria[]>("/finanzas/cuentas-bancarias/");
  return data;
};

/**
 * Resumen de UNA cuenta: saldo, totales del mes y últimos movimientos.
 *
 * No sustituye al renglón del listado ni al revés: el listado no trae
 * movimientos y este resumen no trae los datos de captura de la cuenta.
 */
export const getBankAccountSummary = async (
  id: number,
): Promise<ResumenCuentaBancaria> => {
  const { data } = await v1_api.get<ResumenCuentaBancaria>(
    `/finanzas/cuentas-bancarias/${id}/resumen/`,
  );
  return data;
};

/**
 * Alta de una cuenta. El cuerpo NO lleva `empresa` (la resuelve el backend y la
 * ignora si se envía) ni `saldo_actual`. El error se deja propagar tal cual para
 * que el hook mapee los errores de campo del 400.
 */
export const createBankAccount = async (
  cuenta: CuentaBancariaCreate,
): Promise<CuentaBancaria> => {
  const { data } = await v1_api.post<CuentaBancaria>(
    "/finanzas/cuentas-bancarias/",
    cuenta,
  );
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * El payload omite `empresa`, `saldo_actual` y `activo` a propósito. Con PUT eso
 * los reemplazaría —`saldo_actual` volvería a 0 y `activo` a su default `true`,
 * desincronizando el saldo del historial de movimientos—; con PATCH lo ausente
 * se conserva.
 */
export const updateBankAccount = async (
  id: number,
  cuenta: CuentaBancariaCreate,
): Promise<CuentaBancaria> => {
  const { data } = await v1_api.patch<CuentaBancaria>(
    `/finanzas/cuentas-bancarias/${id}/`,
    cuenta,
  );
  return data;
};

/**
 * Activa o desactiva una cuenta.
 *
 * Es el ÚNICO control de ciclo de vida que expone esta pantalla: el `DELETE` del
 * endpoint es un borrado FÍSICO, no una baja lógica, pese a que el modelo tenga
 * `activo`. Misma decisión que en `banks` (EC-135) — una cuenta ya referenciada
 * por pagos o cobros se retira poniéndola en `activo: false`, no destruyéndola.
 * Por eso no existe una función de borrado en este archivo.
 */
export const setBankAccountActivo = async (
  id: number,
  activo: boolean,
): Promise<CuentaBancaria> => {
  const { data } = await v1_api.patch<CuentaBancaria>(
    `/finanzas/cuentas-bancarias/${id}/`,
    { activo },
  );
  return data;
};
