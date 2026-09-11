import { v1_api } from "@/src/api/v1.api";
import type { CreatePolizaPayload, Poliza } from "../interfaces/poliza.interface";
import type {
  CentroCosto,
  CentroCostoQueryParams,
  CuentaContable,
  CuentaContableQueryParams,
} from "../interfaces/catalogos.interface";

/**
 * Lista las pólizas desde `GET /finanzas/polizas/`.
 *
 * Va SIN parámetros a propósito: el endpoint acepta filtros de servidor (`tipo`,
 * `estatus`, `folio`, `sucursal`, `centro_costo`, rango de `fecha`, `ordering`)
 * pero `DataTable` filtra y busca en memoria sobre el arreglo completo y no
 * expone un puente hacia parámetros de servidor. Se trae la lista entera —el
 * backend ya la acota por empresa— y una sola entrada de caché sirve a toda la
 * pantalla, igual que en `pagos`, `notas-credito` y `banks`.
 *
 * El orden por defecto del backend es `-fecha, -folio_consecutivo, -id`: las
 * pólizas más recientes primero.
 */
export const getPolizas = async (): Promise<Poliza[]> => {
  const { data } = await v1_api.get<Poliza[]>("/finanzas/polizas/");
  return data;
};

/**
 * Alta de una póliza con sus movimientos anidados.
 *
 * El cuerpo NO lleva `empresa` (la resuelve el servidor), ni `fecha`
 * (`auto_now_add`), ni `folio_consecutivo`/`usuario_creacion` (los llena el
 * backend), ni el FK padre dentro de cada renglón (`poliza` es de solo lectura
 * en el serializer). `estatus` viaja como el literal `"Borrador"` — ver
 * `CreatePolizaPayload`.
 *
 * La operación es ATÓMICA (`@transaction.atomic` en `perform_create`): las
 * líneas se crean DESPUÉS del `save()` de la cabecera, así que un movimiento
 * rechazado significa que NO se creó nada, ni siquiera la póliza huérfana. El
 * error se deja propagar tal cual para que el hook lo normalice y lo reparta
 * entre cabecera, líneas y banner.
 *
 * `perform_create` NO valida el cuadre: una póliza descuadrada se crea sin
 * problema y queda en `Borrador`. El cuadre solo se exige al contabilizar.
 */
export const createPoliza = async (
  payload: CreatePolizaPayload,
): Promise<Poliza> => {
  const { data } = await v1_api.post<Poliza>("/finanzas/polizas/", payload);
  return data;
};

/**
 * Contabiliza una póliza: `POST /finanzas/polizas/{id}/contabilizar/`.
 *
 * ES LA ÚNICA VÍA VÁLIDA para dejar una póliza en `Contabilizada`. La acción
 * ejecuta `PolizaService.contabilizar`, que:
 *  - retorna sin hacer nada (200) si ya estaba `Contabilizada` — idempotente;
 *  - responde 400 `{"estatus": [...]}` si está `Cancelada`;
 *  - ejecuta `validar_suma_cero` y responde 400
 *    `{"poliza_detalles": [...]}` si `abs(Σcargo − Σabono) > 0.01`;
 *  - y solo entonces cambia el estatus.
 *
 * Un `PATCH { estatus: "Contabilizada" }` conseguiría el mismo estatus SIN
 * ninguna de esas comprobaciones (`perform_update` solo llama a
 * `serializer.save()`): es un defecto conocido del backend y esta capa no lo
 * usa nunca — este módulo no hace ningún PATCH.
 */
export const contabilizarPoliza = async (id: number): Promise<Poliza> => {
  const { data } = await v1_api.post<Poliza>(
    `/finanzas/polizas/${id}/contabilizar/`,
  );
  return data;
};

/**
 * Cancela una póliza: `POST /finanzas/polizas/{id}/cancelar/`.
 *
 * Es un cambio de estatus y NADA MÁS: `PolizaService.cancelar` no revierte
 * importes ni toca ningún saldo, porque la póliza ES el asiento — no hay nada
 * que devolver, a diferencia de cancelar un pago o una nota de crédito. Es
 * idempotente (cancelar una ya cancelada retorna sin hacer nada) y no tiene
 * precondiciones: el backend permite cancelar tanto un `Borrador` como una
 * `Contabilizada`.
 */
export const cancelarPoliza = async (id: number): Promise<Poliza> => {
  const { data } = await v1_api.post<Poliza>(`/finanzas/polizas/${id}/cancelar/`);
  return data;
};

/**
 * Elimina FÍSICAMENTE una póliza: `DELETE /finanzas/polizas/{id}/`.
 *
 * No es baja lógica: la póliza y sus movimientos desaparecen de la base de datos
 * (`PolizaDetalle.poliza` es `on_delete=CASCADE`) y no hay forma de recuperarlos.
 * El backend lo rechaza solo sobre una `Contabilizada` (400 "Cancelela primero");
 * permite `Borrador` y `Cancelada`. La UI es más estricta: solo lo ofrece sobre
 * borradores capturados a mano (ver `polizaEsEliminable`).
 */
export const deletePoliza = async (id: number): Promise<void> => {
  await v1_api.delete(`/finanzas/polizas/${id}/`);
};

/**
 * Catálogo de cuentas contables: `GET /finanzas/cuentas-contables/`.
 *
 * Los parámetros son opcionales; Axios omite las llaves `undefined`, así que
 * solo viajan las que se fijen. El backend ya acota por la empresa del usuario.
 * Ordena por `codigo, id`.
 *
 * CANDIDATO A EXTRACCIÓN a `features/cuentas-contables/` cuando EC-139 exista.
 */
export const getCuentasContables = async (
  params?: CuentaContableQueryParams,
): Promise<CuentaContable[]> => {
  const { data } = await v1_api.get<CuentaContable[]>(
    "/finanzas/cuentas-contables/",
    { params },
  );
  return data;
};

/**
 * Catálogo de centros de costo: `GET /finanzas/centros-costo/`.
 *
 * CANDIDATO A EXTRACCIÓN a `features/centros-costo/` cuando EC-140 exista.
 */
export const getCentrosCosto = async (
  params?: CentroCostoQueryParams,
): Promise<CentroCosto[]> => {
  const { data } = await v1_api.get<CentroCosto[]>("/finanzas/centros-costo/", {
    params,
  });
  return data;
};
