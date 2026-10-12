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

/**
 * Estado del SKU de muestra de UNA talla, según el SKU que Producción tiene
 * disponible (`sku_produccion`) y el ya vinculado (`sku_muestra`):
 *
 * - `none`: ninguno. Aún no hay SKU de producción; no se puede vincular.
 * - `linkable`: hay SKU de producción y falta vincularlo.
 * - `linked`: vinculado y coincide con el de producción.
 * - `orphan`: vinculado, pero ya no hay SKU de producción visible para la talla
 *   (la línea pasó a producto de catálogo, o la talla cambió). Nada que hacer.
 * - `out_of_sync`: vinculado a un SKU distinto del que hoy tiene Producción.
 *   Se puede volver a vincular.
 */
export type SampleSkuTallaState = "none" | "linkable" | "linked" | "orphan" | "out_of_sync";

type SampleSkuFields = Pick<PedidoDetalleTalla, "sku_muestra" | "sku_produccion">;

/** `undefined` (backend anterior al campo) y la cadena vacía cuentan como `null`. */
const skuOrNull = (value: string | null | undefined): string | null => value?.trim() || null;

export function sampleSkuTallaState(talla: SampleSkuFields): SampleSkuTallaState {
  const produccion = skuOrNull(talla.sku_produccion);
  const muestra = skuOrNull(talla.sku_muestra);
  if (muestra === null) return produccion === null ? "none" : "linkable";
  if (produccion === null) return "orphan";
  return produccion === muestra ? "linked" : "out_of_sync";
}

/**
 * Avance de vinculación de una línea de muestra: tallas con `sku_muestra` sobre
 * todas las tallas de la línea. Cuenta las vinculadas aunque estén por revisar
 * (`orphan`/`out_of_sync`): el indicador dice cuántas TIENEN SKU, no cuántas
 * están al día.
 */
export function sampleSkuLineProgress(linea: Pick<PedidoDetalleLinea, "tallas">): {
  linked: number;
  total: number;
} {
  return {
    linked: linea.tallas.filter((talla) => skuOrNull(talla.sku_muestra) !== null).length,
    total: linea.tallas.length,
  };
}

/**
 * La línea con los SKU recién vinculados puestos ENCIMA del detalle en caché
 * (`linkedSkus`: id de talla → `sku_muestra` que devolvió el backend). Es la
 * superposición local de una corrida de "Vincular todas": cada talla procesada
 * se ve vinculada al instante, sin esperar la relectura final, que es la que
 * trae el dato del servidor y deja esto sin efecto. Sin nada que superponer
 * devuelve la MISMA línea.
 */
export function withLinkedSampleSkus(
  linea: PedidoDetalleLinea,
  linkedSkus: Readonly<Record<number, string>>,
): PedidoDetalleLinea {
  if (!linea.tallas.some((talla) => talla.id in linkedSkus)) return linea;
  return {
    ...linea,
    tallas: linea.tallas.map((talla) =>
      talla.id in linkedSkus ? { ...talla, sku_muestra: linkedSkus[talla.id] } : talla,
    ),
  };
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
