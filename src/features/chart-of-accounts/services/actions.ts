import { v1_api } from "@/src/api/v1.api";
import type {
  CuentaContable,
  CuentaContableCreate,
  CuentaContableQueryParams,
} from "../interfaces/chart-of-account.interface";

/**
 * Catálogo de cuentas contables: `GET /finanzas/cuentas-contables/`.
 *
 * Devuelve un ARREGLO PLANO, sin envoltorio de paginación (ver
 * `CuentaContable`). El backend ya acota los resultados a la empresa del usuario
 * autenticado, así que no hace falta filtrar por empresa en el cliente.
 *
 * Los parámetros son opcionales y Axios omite las llaves `undefined`: la
 * pantalla del catálogo no manda ninguno (filtra en memoria), pero el endpoint
 * los acepta para quien necesite acotar en el servidor.
 */
export const getChartOfAccounts = async (
  params?: CuentaContableQueryParams,
): Promise<CuentaContable[]> => {
  const { data } = await v1_api.get<CuentaContable[]>(
    "/finanzas/cuentas-contables/",
    { params },
  );
  return data;
};

/**
 * Alta de una cuenta contable.
 *
 * El cuerpo NO lleva `empresa` (la resuelve el backend), ni `cuenta_padre` (fuera
 * de alcance: el backend lo deja en `null`), ni `activo` (nace en `true`). El
 * error se deja propagar tal cual para que el hook reparta los errores de campo
 * del 400 —en particular el de `codigo` duplicado—.
 */
export const createChartOfAccount = async (
  cuenta: CuentaContableCreate,
): Promise<CuentaContable> => {
  const { data } = await v1_api.post<CuentaContable>(
    "/finanzas/cuentas-contables/",
    cuenta,
  );
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * Es lo que CONSERVA `cuenta_padre` y `activo`: con PUT, lo ausente del cuerpo
 * se reemplazaría —`cuenta_padre` quedaría en `null` y `activo` volvería a su
 * default—; con PATCH, lo que no se envía no se toca. Por eso el payload es el
 * mismo tipo del alta y ninguno de esos dos campos aparece en él.
 */
export const updateChartOfAccount = async (
  id: number,
  cuenta: CuentaContableCreate,
): Promise<CuentaContable> => {
  const { data } = await v1_api.patch<CuentaContable>(
    `/finanzas/cuentas-contables/${id}/`,
    cuenta,
  );
  return data;
};

/**
 * Activa o desactiva una cuenta contable.
 *
 * Es el ÚNICO control de ciclo de vida que expone esta pantalla, igual que en
 * bancos: el `DELETE` del endpoint es un borrado FÍSICO pese a que el modelo
 * tenga `activo`, y además `cuenta_padre` es `PROTECT`, así que borrar una
 * cuenta con hijas fallaría y borrar una sin hijas destruiría un renglón del
 * catálogo al que las pólizas ya pueden apuntar. Una cuenta que se retira se
 * pone en `activo: false` y sigue visible en el listado.
 */
export const setChartOfAccountActivo = async (
  id: number,
  activo: boolean,
): Promise<CuentaContable> => {
  const { data } = await v1_api.patch<CuentaContable>(
    `/finanzas/cuentas-contables/${id}/`,
    { activo },
  );
  return data;
};
