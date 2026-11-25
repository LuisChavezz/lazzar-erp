/**
 * Nombre de la prenda de un renglón de orden de trabajo (reflejante, corte de
 * manga) y de su línea del pedido, para pantallas, PDF y el prellenado de la
 * salida a maquila (EC-963). Sin React.
 *
 * Una línea de MUESTRA no tiene producto de catálogo: `producto` /
 * `producto_id` llegan `null` y `producto_nombre` llega `null` (onboarding) o
 * sin la clave (detalle: DRF la omite cuando el `source` con punto cae en un
 * producto nulo). El nombre de la muestra es `producto_nombre_externo`, que hoy
 * solo publica el onboarding de OR y OCM (EC-964); el detalle de la orden no lo
 * trae, así que ahí el renglón se rotula de forma neutra.
 *
 * Nunca se cae al id: «Producto #null» era justo el síntoma de EC-963.
 */
import { cleanText } from "@/src/utils/cleanText";

/** Rótulo de un renglón sin producto de catálogo ni nombre de muestra. */
export const SIN_PRODUCTO_CATALOGO = "Sin producto de catálogo";

export interface WorkOrderProductNames {
  producto_nombre?: string | null;
  producto_nombre_externo?: string | null;
}

/**
 * El nombre de catálogo; si no hay, el nombre de la muestra; si tampoco,
 * `SIN_PRODUCTO_CATALOGO`. El SKU NO va aquí: cada pantalla lo pinta donde ya
 * pinta SKUs.
 */
export const workOrderProductLabel = (line: WorkOrderProductNames): string =>
  cleanText(line.producto_nombre) ??
  cleanText(line.producto_nombre_externo) ??
  SIN_PRODUCTO_CATALOGO;

/**
 * Llave para agrupar renglones por prenda (`groupWorkOrderGarments`): el
 * producto de catálogo o, en una muestra, su línea del pedido. Sin ella todas
 * las muestras de una orden caerían en un mismo grupo «Sin producto de
 * catálogo» aunque sean prendas distintas.
 */
export const workOrderProductGroupId = (line: {
  producto: number | null;
  pedido_detalle: number;
}): number | string => line.producto ?? `pedido-detalle-${line.pedido_detalle}`;
