import type { SpecialOrderLine, SpecialOrderTalla } from "../interfaces/special-order.interface";

/**
 * SKU de producción de una talla, con la MISMA fórmula que el backend:
 * `f"MP{pedido_detalle_id}-{color.codigo}-{talla.nombre}".strip().upper()`
 * (`variante_onboarding` y `PedidoDetalleTallaEspecialSerializer.get_sku_siguiente`
 * en `produccion/api/views.py` / `serializers.py` de nucleo-erp). `sku_prefijo`
 * ya es `MP{pedido_detalle_id}`. El recorte y las mayúsculas aplican a la cadena
 * completa, no a cada parte.
 */
export const buildSampleSku = (
  skuPrefijo: string,
  colorCodigo: string,
  tallaNombre: string,
): string => `${skuPrefijo}-${colorCodigo}-${tallaNombre}`.trim().toUpperCase();

export interface SampleSkuPreviewRow {
  talla: SpecialOrderTalla;
  /** El SKU que se generará, o `null` si no se puede saber todavía. */
  sku: string | null;
}

export interface SampleSkuPreview {
  /** Una por talla con cantidad: son las únicas que el alta genera. */
  rows: SampleSkuPreviewRow[];
  /** Por qué el alta fallaría con seguridad; `null` si nada lo impide. */
  blocker: string | null;
}

export const CHOSEN_COLOR_WITHOUT_CODE =
  "El color elegido no tiene código, que forma parte del SKU. Elige otro o complétalo en el catálogo de colores.";

export const LINE_COLOR_WITHOUT_CODE =
  "El color de la línea no tiene código, que forma parte del SKU. Complétalo en el catálogo de colores para poder generar los SKU.";

/**
 * Vista previa del SKU por talla con cantidad.
 *
 * - Si el backend ya lo calculó (`sku_siguiente`), se usa tal cual.
 * - Si la línea no tiene color, `sku_siguiente` llega en `null` y se arma aquí
 *   con el color elegido en el asistente (`chosenColor`; `null` mientras no se
 *   elija o no se conozca).
 * - Si la línea SÍ tiene color, un `sku_siguiente` en `null` en una talla sin
 *   SKU de producción solo puede significar que ese color no tiene `codigo`:
 *   el backend rechazaría el alta, así que se bloquea.
 */
export function getSampleSkuPreview(
  line: SpecialOrderLine,
  chosenColor: { codigo: string } | null,
): SampleSkuPreview {
  const requiresColor = line.color_nombre === null;
  // Sin recortar: el backend rechaza solo el código vacío (`if not color.codigo`)
  // y uno con espacios entra tal cual al SKU.
  const chosenCode = chosenColor?.codigo ?? "";

  const rows = line.tallas
    .filter((talla) => Number(talla.cantidad) > 0)
    .map((talla) => ({
      talla,
      sku:
        talla.sku_siguiente ??
        (requiresColor && chosenCode
          ? buildSampleSku(line.sku_prefijo, chosenCode, talla.talla_nombre)
          : null),
    }));

  let blocker: string | null = null;
  if (requiresColor) {
    if (chosenColor && !chosenCode) blocker = CHOSEN_COLOR_WITHOUT_CODE;
  } else if (rows.some((row) => row.sku === null && !row.talla.sku_produccion)) {
    blocker = LINE_COLOR_WITHOUT_CODE;
  }

  return { rows, blocker };
}
