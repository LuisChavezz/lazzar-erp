import { AxiosError } from "axios";
import type { PedidoCancelOcBloqueante } from "../interfaces/pedido-cancel.interface";

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * OC que impiden cancelar el pedido, leídas del `400` de `cancelar/`
 * (`ordenes_compra_bloqueantes`, nucleo-erp#1413, EC-973), o `null` si el error
 * no es ese rechazo.
 *
 * Solo cuenta un `400` cuyo cuerpo trae la lista con al menos una OC bien
 * formada (`id` entero positivo). Un renglón mal formado se omite; un `folio`
 * vacío o que no sea texto se lee como `null` (la OC se nombra `#id`), y un
 * `estatus` que no sea un entero, como `null` (sin badge). Nunca
 * lanza: corre en el `onError` de la mutación.
 */
export const pedidoCancelBlockingOcs = (error: unknown): PedidoCancelOcBloqueante[] | null => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return null;
  const data = error.response.data as unknown;
  if (!data || typeof data !== "object") return null;
  const raw = (data as Record<string, unknown>).ordenes_compra_bloqueantes;
  if (!Array.isArray(raw)) return null;
  const ocs = raw.flatMap((item): PedidoCancelOcBloqueante[] => {
    if (!item || typeof item !== "object") return [];
    const { id, folio, estatus } = item as Record<string, unknown>;
    if (!isPositiveInteger(id)) return [];
    return [
      {
        id,
        folio: typeof folio === "string" && folio.trim() ? folio : null,
        estatus: typeof estatus === "number" && Number.isInteger(estatus) ? estatus : null,
      },
    ];
  });
  return ocs.length > 0 ? ocs : null;
};

/** Cómo se nombra una OC sin folio (mismo respaldo que el backend y el listado de OC). */
export const purchaseOrderLabel = (oc: { id: number; folio: string | null }): string =>
  oc.folio ?? `#${oc.id}`;
