import { v1_api } from "@/src/api/v1.api";
import type { Banco, BancoCreate } from "../interfaces/bank.interface";

/**
 * Listado completo del catálogo de bancos.
 *
 * Devuelve un ARREGLO PLANO, sin envoltorio de paginación (ver `Banco`). El
 * backend ya acota los resultados a la empresa del usuario autenticado, así que
 * no hace falta filtrar por empresa en el cliente.
 */
export const getBanks = async (): Promise<Banco[]> => {
  const { data } = await v1_api.get<Banco[]>("/finanzas/bancos/");
  return data;
};

/**
 * Alta de un banco. El cuerpo NO lleva `empresa`: el backend la resuelve del
 * usuario autenticado. El error se deja propagar tal cual para que el hook mapee
 * los errores de campo del 400.
 */
export const createBank = async (banco: BancoCreate): Promise<Banco> => {
  const { data } = await v1_api.post<Banco>("/finanzas/bancos/", banco);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * El payload omite `empresa` y `activo` a propósito (ver `BancoCreate`). Con PUT
 * eso los reemplazaría —`activo` volvería a su default `true` y `empresa` sería
 * rechazada—; con PATCH lo ausente se conserva.
 */
export const updateBank = async (id: number, banco: BancoCreate): Promise<Banco> => {
  const { data } = await v1_api.patch<Banco>(`/finanzas/bancos/${id}/`, banco);
  return data;
};

/**
 * Activa o desactiva un banco.
 *
 * Es el ÚNICO control de ciclo de vida que expone esta pantalla: el `DELETE` del
 * endpoint es un borrado FÍSICO (`instance.delete()`), no una baja lógica, pese
 * a que el modelo tenga `activo`. Por eso no existe una función de borrado en
 * este archivo ni una acción de eliminar en la UI — un banco que ya fue
 * referenciado por cuentas bancarias o movimientos se retira poniéndolo en
 * `activo: false`, no destruyéndolo.
 */
export const setBankActivo = async (id: number, activo: boolean): Promise<Banco> => {
  const { data } = await v1_api.patch<Banco>(`/finanzas/bancos/${id}/`, { activo });
  return data;
};
