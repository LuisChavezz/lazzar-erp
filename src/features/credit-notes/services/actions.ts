import { v1_api } from "@/src/api/v1.api";
import type {
  CreateNotaCreditoPayload,
  EmitirNotaCreditoPayload,
  NotaCredito,
} from "../interfaces/credit-note.interface";

/**
 * Lista las notas de crédito desde `GET /finanzas/notas-credito/`.
 *
 * Va SIN parámetros a propósito: el endpoint acepta filtros de servidor
 * (`cliente`, `estatus`, `folio`, `factura`, `motivo`, rango de `fecha_emision`,
 * `ordering`) pero `DataTable` filtra y busca en memoria sobre el arreglo
 * completo y no expone un puente hacia parámetros de servidor. Se trae la lista
 * entera —el backend ya la acota por `factura__empresa`— y una sola entrada de
 * caché sirve a toda la pantalla, igual que en `pagos` y `banks`.
 */
export const getNotasCredito = async (): Promise<NotaCredito[]> => {
  const { data } = await v1_api.get<NotaCredito[]>("/finanzas/notas-credito/");
  return data;
};

/**
 * Alta de una nota de crédito con sus líneas anidadas.
 *
 * El cuerpo NO lleva `empresa` (el modelo no tiene ese campo) ni `fecha_emision`
 * (`auto_now_add`, de solo lectura) ni el FK padre dentro de cada renglón
 * (`nota_credito` es de solo lectura en el serializer). El error se deja
 * propagar tal cual para que el hook lo normalice y lo reparta entre cabecera,
 * líneas y banner.
 *
 * Si `estatus` es `"Emitida"`, el backend aplica el crédito a la cuenta por
 * cobrar de la factura DENTRO de la misma transacción: un rechazo (factura sin
 * CxC, total mayor al saldo) significa que NO se creó nada.
 */
export const createNotaCredito = async (
  payload: CreateNotaCreditoPayload,
): Promise<NotaCredito> => {
  const { data } = await v1_api.post<NotaCredito>(
    "/finanzas/notas-credito/",
    payload,
  );
  return data;
};

/**
 * Emite una nota que estaba en borrador: `PATCH /finanzas/notas-credito/{id}/`
 * con solo `{ estatus: "Emitida" }`.
 *
 * PATCH y no PUT: el resto de los campos no cambian. Las líneas no se pueden
 * modificar por esta vía en ningún caso — el serializer declara
 * `nested_write_on_create_only = ("nota_credito_detalles",)`, así que un
 * `nota_credito_detalles` en el cuerpo se ignoraría en silencio; por eso no se
 * manda.
 *
 * `perform_update` aplica el crédito cuando el estatus PASA a `Emitida` desde
 * otro valor, con las mismas validaciones que el alta emitida (factura con CxC,
 * total menor o igual al saldo).
 */
export const emitirNotaCredito = async (id: number): Promise<NotaCredito> => {
  const payload: EmitirNotaCreditoPayload = { estatus: "Emitida" };
  const { data } = await v1_api.patch<NotaCredito>(
    `/finanzas/notas-credito/${id}/`,
    payload,
  );
  return data;
};

/**
 * Cancela una nota de crédito: `POST /finanzas/notas-credito/{id}/cancelar/`.
 *
 * Devuelve 200 con el documento. Es idempotente: cancelar una nota ya cancelada
 * retorna sin hacer nada. Si la nota estaba `Emitida`, el backend DEVUELVE el
 * importe acreditado al saldo de la cuenta por cobrar y reajusta su estatus
 * (`Pendiente` o `Parcial`); si estaba en `Borrador` solo la marca `Cancelada`,
 * porque nunca tocó la CxC.
 */
export const cancelarNotaCredito = async (id: number): Promise<NotaCredito> => {
  const { data } = await v1_api.post<NotaCredito>(
    `/finanzas/notas-credito/${id}/cancelar/`,
  );
  return data;
};

/**
 * Elimina FÍSICAMENTE una nota de crédito:
 * `DELETE /finanzas/notas-credito/{id}/`.
 *
 * No es baja lógica: el registro desaparece de la base de datos y no hay forma
 * de recuperarlo. El backend lo permite ÚNICAMENTE sobre notas en `Borrador`
 * (una `Emitida` responde 400 "Cancélela primero"), que por definición nunca
 * tocaron ninguna cuenta por cobrar. La UI solo ofrece la acción sobre borradores
 * y lo advierte explícitamente en el diálogo de confirmación.
 */
export const deleteNotaCredito = async (id: number): Promise<void> => {
  await v1_api.delete(`/finanzas/notas-credito/${id}/`);
};
