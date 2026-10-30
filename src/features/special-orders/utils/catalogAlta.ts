import type {
  AltaCatalogoPayload,
  SpecialOrderLine,
  SpecialOrderTalla,
} from "../interfaces/special-order.interface";
import { isGeneratedTalla } from "./lineSkuStatus";

/** Aviso del botón "Dar de alta en catálogo" deshabilitado por falta de categoría. */
export const CATALOG_ALTA_BUTTON_NO_CATEGORY =
  "Sin categoría; se captura en la cotización.";

/**
 * La talla tiene SKU de producción que aún no está en catálogo. Hace falta
 * que esté generada (`isGeneratedTalla`): `aplica_catalogo` también es `false`
 * en una talla SIN variante, y esa no tiene nada que dar de alta.
 */
export const isTallaPendingCatalogAlta = (talla: SpecialOrderTalla): boolean =>
  isGeneratedTalla(talla) && !talla.aplica_catalogo;

/**
 * La línea tiene algo que dar de alta con `alta-catalogo`: alguna talla con
 * SKU de producción pendiente. Es la condición para ofrecer el botón; sin
 * pendientes el backend responde `400` en `pedido_detalle_id`.
 */
export const hasPendingCatalogAlta = (line: SpecialOrderLine): boolean =>
  line.tallas.some(isTallaPendingCatalogAlta);

/**
 * Cuerpo de `alta-catalogo`: `categoria_producto` solo cuando se da, que es
 * cuando la línea no tiene categoría (con una, el backend la ignoraría).
 */
export const buildAltaCatalogoPayload = (
  pedidoDetalleId: number,
  categoriaProductoId?: number,
): AltaCatalogoPayload => ({
  pedido_detalle_id: pedidoDetalleId,
  ...(categoriaProductoId !== undefined && { categoria_producto: categoriaProductoId }),
});

export const CATALOG_ALTA_WITHOUT_CATEGORY =
  "La línea no tiene categoría de producto, así que no se puede dar de alta en catálogo.";

export const CATALOG_ALTA_INHERITED_OFF =
  "Las tallas ya generadas de esta línea no están en catálogo, así que la casilla empieza desmarcada.";

/**
 * Lo que quede fuera de catálogo se completa después con "Dar de alta en
 * catálogo" de la tarjeta (`alta-catalogo/`), que lo cuelga del mismo producto.
 */
const CATALOG_ALTA_LATER =
  "Las que queden fuera se pueden agregar después con \"Dar de alta en catálogo\" en la tarjeta.";

export const CATALOG_ALTA_MIXED = `Esta línea ya tiene tallas con y sin alta en catálogo. ${CATALOG_ALTA_LATER}`;

export const CATALOG_ALTA_DEVIATION = `Con esta elección la línea quedará con unas tallas en catálogo y otras no. ${CATALOG_ALTA_LATER}`;

/**
 * Las tallas ya generadas están en catálogo: las nuevas cuelgan del mismo
 * producto (el backend lo reutiliza, nucleo-erp #764). `ejemplo` es el SKU de
 * catálogo de una de ellas, si llegó.
 */
export const catalogAltaInheritedOn = (ejemplo: string | null): string =>
  `Las tallas ya generadas de esta línea están en catálogo${
    ejemplo ? ` (p. ej. ${ejemplo})` : ""
  }, así que las nuevas se agregan al mismo producto.`;

/** Lo que una línea PARCIAL (alguna talla con `sku_produccion`) ya tiene decidido. */
export interface CatalogAltaInherited {
  /** Valor con el que empieza la casilla: `true` solo si TODAS las generadas están en catálogo. */
  value: boolean;
  reason: string;
  /** Las generadas ya están repartidas (unas en catálogo y otras no). */
  mixed: boolean;
  /**
   * Alguna generada está en catálogo: marcarla agrega las nuevas a ese mismo
   * producto (no se crea otro, así que no aplica la vista previa del código).
   */
  hasCatalogProduct: boolean;
}

/**
 * Qué admite "Dar de alta en catálogo" en la línea:
 *  - `blocked`: sin `categoria_producto` el backend responde
 *    `400 {"alta_catalogo"}`, así que queda desmarcada y fija.
 *  - `editable`: se elige; `categoriaId` es la de la línea. En una línea sin
 *    tallas generadas `inherited` es `null` y la casilla empieza desmarcada.
 *    En una PARCIAL empieza con el valor heredado de las generadas; sigue
 *    editable porque el alta puede rechazar el catálogo (p. ej. una talla nueva
 *    que no es de la categoría) y la talla debe poder generarse sin él.
 *
 * La señal de "ya generada" es `sku_produccion` (`isGeneratedTalla`), la misma
 * que usan la vista previa y la tarjeta: `aplica_catalogo` es `false` también
 * en una talla sin variante.
 */
export type CatalogAltaState =
  | { kind: "blocked"; reason: string }
  | { kind: "editable"; categoriaId: number; inherited: CatalogAltaInherited | null };

export function getCatalogAltaState(line: SpecialOrderLine): CatalogAltaState {
  if (line.categoria_producto === null) {
    return { kind: "blocked", reason: CATALOG_ALTA_WITHOUT_CATEGORY };
  }
  const categoriaId = line.categoria_producto.id;

  const generadas = line.tallas.filter(isGeneratedTalla);
  if (generadas.length === 0) return { kind: "editable", categoriaId, inherited: null };

  const enCatalogo = generadas.filter((talla) => talla.aplica_catalogo);
  const hasCatalogProduct = enCatalogo.length > 0;

  if (enCatalogo.length === generadas.length) {
    const ejemplo = enCatalogo.find((talla) => talla.sku_catalogo)?.sku_catalogo ?? null;
    return {
      kind: "editable",
      categoriaId,
      inherited: {
        value: true,
        reason: catalogAltaInheritedOn(ejemplo),
        mixed: false,
        hasCatalogProduct,
      },
    };
  }
  return {
    kind: "editable",
    categoriaId,
    inherited: {
      value: false,
      reason: hasCatalogProduct ? CATALOG_ALTA_MIXED : CATALOG_ALTA_INHERITED_OFF,
      mixed: hasCatalogProduct,
      hasCatalogProduct,
    },
  };
}

/** Valor con el que empieza la casilla al abrir el asistente. */
export const getDefaultAltaCatalogo = (state: CatalogAltaState): boolean =>
  state.kind === "editable" ? (state.inherited?.value ?? false) : false;

/** El `alta_catalogo` que se envía: el elegido, salvo que la línea no lo admita. */
export const resolveAltaCatalogo = (state: CatalogAltaState, chosen: boolean): boolean =>
  state.kind === "editable" && chosen;

/**
 * La elección deja la línea repartida entre catálogo y fuera de él: se aparta
 * del valor heredado de una línea que hoy NO está mezclada (si ya lo está, el
 * aviso de `CATALOG_ALTA_MIXED` lo cubre).
 */
export const catalogAltaDeviates = (state: CatalogAltaState, chosen: boolean): boolean =>
  state.kind === "editable" &&
  state.inherited !== null &&
  !state.inherited.mixed &&
  chosen !== state.inherited.value;
