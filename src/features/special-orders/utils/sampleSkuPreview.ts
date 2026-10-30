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
  /**
   * Una por talla con cantidad y SIN SKU de producción: son las únicas que el
   * alta genera (el backend excluye las que ya tienen variante).
   */
  rows: SampleSkuPreviewRow[];
  /** Qué mostrar en una fila sin SKU. */
  missingSkuHint: string;
  /** Por qué no se puede enviar todavía; `null` si nada lo impide. */
  blocker: string | null;
}

/**
 * Color elegido en el asistente (solo cuenta en una línea sin color): `null`
 * si no se ha elegido, `"loading"` / `"unavailable"` si se eligió pero su
 * `codigo` aún no se conoce (catálogo cargando o sin ese color), o el color.
 */
export type ChosenSampleColor = { codigo: string } | "loading" | "unavailable" | null;

export const CHOOSE_COLOR_HINT = "elige el color en el paso anterior";
export const CHOSEN_COLOR_LOADING = "Cargando el código del color elegido...";
export const CHOSEN_COLOR_UNAVAILABLE =
  "No se pudo leer el código del color elegido. Regresa al paso anterior y vuelve a elegirlo.";
export const LINE_COLOR_WITHOUT_CODE =
  "El color de la línea no tiene código, que forma parte del SKU. Complétalo en el catálogo de colores para poder generar los SKU.";

/**
 * Vista previa del SKU por talla que generará el alta.
 *
 * - Si el backend ya lo calculó (`sku_siguiente`), se usa tal cual.
 * - Si la línea no tiene color, `sku_siguiente` llega en `null` y se arma aquí
 *   con el color elegido. Mientras su `codigo` no se conozca no se deja enviar.
 * - Si la línea SÍ tiene color, un `sku_siguiente` en `null` en una talla sin
 *   SKU de producción solo puede significar que ese color no tiene `codigo`:
 *   el backend rechazaría el alta, así que se bloquea.
 */
export function getSampleSkuPreview(
  line: SpecialOrderLine,
  chosenColor: ChosenSampleColor,
): SampleSkuPreview {
  const requiresColor = line.color_nombre === null;
  // Sin recortar: el backend arma el SKU con el código tal cual.
  const chosenCode =
    chosenColor !== null && typeof chosenColor === "object" ? chosenColor.codigo : null;

  const rows = line.tallas
    .filter((talla) => Number(talla.cantidad) > 0 && !talla.sku_produccion)
    .map((talla) => ({
      talla,
      sku:
        talla.sku_siguiente ??
        (requiresColor && chosenCode !== null
          ? buildSampleSku(line.sku_prefijo, chosenCode, talla.talla_nombre)
          : null),
    }));

  if (!requiresColor) {
    const lineColorWithoutCode = rows.some((row) => row.sku === null);
    return {
      rows,
      missingSkuHint: "SKU no disponible",
      blocker: lineColorWithoutCode ? LINE_COLOR_WITHOUT_CODE : null,
    };
  }
  if (chosenColor === "loading") {
    return { rows, missingSkuHint: "cargando el color...", blocker: CHOSEN_COLOR_LOADING };
  }
  if (chosenColor === "unavailable") {
    return { rows, missingSkuHint: "SKU no disponible", blocker: CHOSEN_COLOR_UNAVAILABLE };
  }
  // Sin color elegido no hace falta bloquear aquí: el esquema exige `color`.
  return { rows, missingSkuHint: CHOOSE_COLOR_HINT, blocker: null };
}
