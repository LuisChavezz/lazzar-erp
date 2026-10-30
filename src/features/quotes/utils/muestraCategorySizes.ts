/**
 * Tallas de una MUESTRA según su categoría de producto (EC-647).
 *
 * El backend (`_save_cotizacion_detalle`) rechaza en una muestra con categoría
 * las tallas que no son de esa categoría (`CategoriaProductoTalla`), con
 * `400 {"detalle": "La talla X no corresponde a la categoría Y."}`. Una
 * categoría SIN tallas configuradas no restringe, y una muestra sin categoría
 * no se valida. Estas funciones reproducen esa regla en el cliente.
 */
import type { Size } from "../../sizes/interfaces/size.interface";

/**
 * Tallas que se ofrecen a la muestra: las de su categoría
 * (`GET /catalogo/talla/?categoria_producto=<id>`) o, si la categoría no tiene
 * ninguna (`[]`), el catálogo global, igual que el backend, que no la restringe.
 */
export const resolveMuestraSizes = (categorySizes: readonly Size[], globalSizes: Size[]): Size[] =>
  categorySizes.length > 0 ? [...categorySizes] : globalSizes;

/** Resultado de `pruneSizeQuantities`. */
export interface PrunedSizeQuantities {
  /** Cantidades de las tallas que siguen aplicando, tal como se capturaron. */
  kept: Record<number, string>;
  /** Ids de las tallas capturadas (con valor) que ya no aplican. */
  removedSizeIds: number[];
}

/**
 * Separa las cantidades capturadas de una fila entre las tallas que siguen en
 * `availableSizes` y las que no. Una entrada vacía de una talla que ya no aplica
 * se descarta sin contarla como quitada: no había nada capturado.
 *
 * Al cambiar la categoría de una muestra se pasa la lista YA resuelta de la
 * nueva categoría (`resolveMuestraSizes`), así que con una categoría sin tallas
 * se conserva todo lo que sea del catálogo global.
 */
export const pruneSizeQuantities = (
  quantities: Record<number, string>,
  availableSizes: readonly Size[],
): PrunedSizeQuantities => {
  const available = new Set(availableSizes.map((size) => size.id));
  const kept: Record<number, string> = {};
  const removedSizeIds: number[] = [];
  for (const [rawId, value] of Object.entries(quantities)) {
    const sizeId = Number(rawId);
    if (available.has(sizeId)) {
      kept[sizeId] = value;
    } else if ((value ?? "").trim() !== "") {
      removedSizeIds.push(sizeId);
    }
  }
  return { kept, removedSizeIds };
};

/** Talla capturada que no corresponde a la categoría de la muestra. */
export interface IncompatibleSize {
  id: number;
  nombre: string;
  /** Cantidad tal como está capturada (texto, igual que en `useSizesState`). */
  cantidad: string;
}

/**
 * Tallas con cantidad capturada en `quantities` que no están en
 * `availableSizes`: las de una muestra guardada antes de EC-647 con tallas
 * ajenas a su categoría. El nombre sale de `knownSizes` (las tallas del item o
 * el catálogo global); sin él se muestra el id.
 */
export const findIncompatibleSizes = (
  quantities: Record<number, string> | undefined,
  availableSizes: readonly Size[],
  knownSizes: readonly Size[],
): IncompatibleSize[] => {
  const { removedSizeIds } = pruneSizeQuantities(quantities ?? {}, availableSizes);
  return removedSizeIds.map((id) => ({
    id,
    nombre: knownSizes.find((size) => size.id === id)?.nombre ?? `#${id}`,
    cantidad: (quantities ?? {})[id] ?? "",
  }));
};

export const INCOMPATIBLE_SIZES_ERROR = "Quita las tallas que no son de la categoría";

export const MUESTRA_SIZES_LOADING_MESSAGE = "Cargando las tallas de la categoría…";

export const MUESTRA_SIZES_ERROR_MESSAGE =
  "No se pudieron cargar las tallas de la categoría. Cierra el diálogo e inténtalo de nuevo.";

/** Estado de las tallas de una fila de muestra mientras su lista no está lista. */
export type MuestraSizesStatus = "loading" | "error";
