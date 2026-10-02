import type { PedidoDetalleLinea, PedidoDetalleTalla } from "../interfaces/order.interface";

/**
 * Nombre visible de una línea. `producto_nombre` llega AUSENTE (no `null`) en
 * una línea de MUESTRA —el serializer lo declara con `source="producto.nombre"`
 * sin `default=None`, así que DRF lanza `SkipField`—, y ahí el nombre real vive
 * en `producto_nombre_externo`. Una línea sin ninguno de los dos (posible: el
 * contrato permite `producto: null` sin nombre externo) cae a "—".
 */
export function lineProductName(linea: PedidoDetalleLinea): string {
  return linea.producto_nombre || linea.producto_nombre_externo || "—";
}

/**
 * Línea de MUESTRA. La señal fiable es un `producto_nombre_externo` no vacío,
 * no `producto: null`: hay líneas con `producto: null` y sin nombre externo que
 * NO son muestras reconocibles, y no se les inventa la etiqueta.
 */
export function isSampleLine(linea: PedidoDetalleLinea): boolean {
  return Boolean(linea.producto_nombre_externo?.trim());
}

/** Resumen de tallas como lo pinta la tabla de la cotización: "CH (5), M (3)". */
export function lineSizesSummary(linea: PedidoDetalleLinea): string {
  if (linea.tallas.length === 0) return "—";
  return linea.tallas.map((talla) => `${talla.talla_nombre} (${talla.cantidad})`).join(", ");
}

export type LineServiceFlag = keyof Pick<
  PedidoDetalleTalla,
  "lleva_bordado" | "lleva_reflejante" | "lleva_corte_manga" | "lleva_cambio_talla"
>;

/** ¿Alguna talla de alguna línea lleva el servicio? */
export function anyLineHasService(detalles: PedidoDetalleLinea[], flag: LineServiceFlag): boolean {
  return detalles.some((linea) => linea.tallas.some((talla) => talla[flag]));
}

export type LineServiceSummary =
  | { kind: "all" }
  | { kind: "none" }
  /** Solo algunas tallas lo llevan; `sizes` son las que SÍ. */
  | { kind: "partial"; sizes: string[] };

/**
 * Un servicio (bordado, reflejante, corte manga) a nivel de LÍNEA. En el pedido
 * esas banderas viven por TALLA; la tabla de la cotización las muestra por
 * partida. Cuando todas las tallas coinciden se resume en Sí/No; si difieren,
 * "Parcial" con las tallas que sí lo llevan, en vez de afirmar algo que solo es
 * cierto para una parte de la línea.
 */
export function summarizeLineService(
  linea: PedidoDetalleLinea,
  flag: LineServiceFlag,
): LineServiceSummary {
  const sizes = linea.tallas.filter((talla) => talla[flag]).map((talla) => talla.talla_nombre);
  if (sizes.length === 0) return { kind: "none" };
  if (sizes.length === linea.tallas.length) return { kind: "all" };
  return { kind: "partial", sizes };
}
