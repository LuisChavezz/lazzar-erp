import type { SpecialOrderLine } from "../interfaces/special-order.interface";
import { isGeneratedTalla } from "./lineSkuStatus";

export const CATALOG_ALTA_WITHOUT_CATEGORY =
  "La línea no tiene categoría de producto, así que no se puede dar de alta en catálogo.";

export const CATALOG_ALTA_INHERITED_OFF =
  "Las tallas ya generadas de esta línea no están en catálogo, así que las nuevas tampoco se dan de alta.";

export const CATALOG_ALTA_MIXED =
  "Esta línea ya tiene tallas con y sin alta en catálogo, así que las nuevas no se dan de alta en catálogo.";

/**
 * Las tallas ya generadas están en catálogo: las nuevas cuelgan del mismo
 * producto (el backend lo reutiliza, nucleo-erp #764). `ejemplo` es el SKU de
 * catálogo de una de ellas, si llegó.
 */
export const catalogAltaInheritedOn = (ejemplo: string | null): string =>
  `Las tallas ya generadas de esta línea están en catálogo${
    ejemplo ? ` (p. ej. ${ejemplo})` : ""
  }, así que las nuevas se agregan al mismo producto.`;

/**
 * Qué admite "Dar de alta en catálogo" en la línea:
 *  - `free`: se elige (línea sin tallas generadas y con categoría).
 *  - `locked`: el valor queda fijo en `value` y `reason` dice por qué.
 *
 * En una línea PARCIAL (alguna talla con `sku_produccion`) el valor se hereda
 * de las tallas ya generadas, para que la línea no quede repartida: todas en
 * catálogo → marcada; ninguna → desmarcada. Si ya están mezcladas (`mixed`)
 * queda desmarcada y solo se avisa; completarlas es `alta-catalogo/`, que aquí
 * no se ofrece. La señal de "ya generada" es `sku_produccion`, la misma que
 * usan la vista previa y la tarjeta: `aplica_catalogo` es `false` también en
 * una talla sin variante.
 *
 * Sin `categoria_producto` (línea sin tallas generadas) el backend responde
 * `400 {"alta_catalogo"}`, así que se bloquea desmarcada.
 */
export type CatalogAltaState =
  | { kind: "free" }
  | { kind: "locked"; value: boolean; reason: string; mixed: boolean };

export function getCatalogAltaState(line: SpecialOrderLine): CatalogAltaState {
  const generadas = line.tallas.filter(isGeneratedTalla);

  if (generadas.length > 0) {
    const enCatalogo = generadas.filter((talla) => talla.aplica_catalogo);
    if (enCatalogo.length === generadas.length) {
      const ejemplo = enCatalogo.find((talla) => talla.sku_catalogo)?.sku_catalogo ?? null;
      return {
        kind: "locked",
        value: true,
        reason: catalogAltaInheritedOn(ejemplo),
        mixed: false,
      };
    }
    if (enCatalogo.length === 0) {
      return { kind: "locked", value: false, reason: CATALOG_ALTA_INHERITED_OFF, mixed: false };
    }
    return { kind: "locked", value: false, reason: CATALOG_ALTA_MIXED, mixed: true };
  }

  if (line.categoria_producto === null) {
    return { kind: "locked", value: false, reason: CATALOG_ALTA_WITHOUT_CATEGORY, mixed: false };
  }
  return { kind: "free" };
}

/** El `alta_catalogo` que se envía: el heredado si está fijo, si no el elegido. */
export const resolveAltaCatalogo = (state: CatalogAltaState, chosen: boolean): boolean =>
  state.kind === "locked" ? state.value : chosen;
