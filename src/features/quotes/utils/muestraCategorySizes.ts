/**
 * Tallas de una MUESTRA según su categoría de producto (EC-647).
 *
 * El backend (`_save_cotizacion_detalle`) rechaza en una muestra con categoría
 * las tallas que no son de esa categoría (`CategoriaProductoTalla`), con
 * `400 {"detalle": "La talla X no corresponde a la categoría Y."}`. Una
 * categoría SIN tallas configuradas no acepta ninguna
 * (`400 {"detalle": "Partida N: la categoría X no tiene tallas configuradas."}`,
 * nucleo-erp #927), y una muestra sin categoría no se valida. Estas funciones
 * reproducen esa regla en el cliente.
 */
import type { Size } from "../../sizes/interfaces/size.interface";

/** Tallas de una muestra ya resueltas (su lista, si tiene categoría, ya cargó). */
export interface ResolvedMuestraSizes {
  sizes: Size[];
  /** `"empty"`: la muestra tiene categoría y esa categoría no ofrece ninguna talla. */
  status: "empty" | null;
  /** `true` si `sizes` es la lista de la categoría; `false` si es el catálogo global. */
  restricted: boolean;
}

/**
 * Tallas que se ofrecen a la muestra según su categoría:
 *  - sin categoría (`categorySizes === null`): el catálogo global, que el
 *    backend no restringe;
 *  - con categoría: su lista (`GET /catalogo/talla/?categoria_producto=<id>`).
 *    Si viene vacía NO se cae al catálogo global (#927): no se ofrece ninguna
 *    talla y el estado `"empty"` lo explica y frena la confirmación.
 *
 * La lista por categoría solo trae tallas ACTIVAS, así que también viene vacía
 * cuando todas las tallas de la categoría están desactivadas (su `tallas` del
 * catálogo de categorías no está vacío). Se trata igual: el backend solo acepta
 * tallas activas de la categoría, así que tampoco hay ninguna que capturar.
 */
export const resolveMuestraSizes = (
  categorySizes: Size[] | null,
  globalSizes: Size[],
): ResolvedMuestraSizes => {
  if (categorySizes === null) return { sizes: globalSizes, status: null, restricted: false };
  if (categorySizes.length === 0) return { sizes: [], status: "empty", restricted: true };
  return { sizes: categorySizes, status: null, restricted: true };
};

/** Resultado de `pruneSizeQuantities`. */
export interface PrunedSizeQuantities {
  /** Cantidades de las tallas que siguen aplicando, tal como se capturaron. */
  kept: Record<number, string>;
  /** Ids de las tallas capturadas (con valor) que ya no aplican. */
  removedSizeIds: number[];
}

/**
 * ¿Hay piezas capturadas? Misma regla que `parseSizeQuantity(raw) > 0` (que es
 * lo que `getItemSizes` envía), sin importarla: `useSizesState` ya importa este
 * módulo.
 */
const hasPieces = (raw: string | undefined): boolean => {
  const value = (raw ?? "").trim();
  return /^\d+$/.test(value) && Number(value) > 0;
};

/**
 * Separa las cantidades capturadas de una fila entre las tallas que siguen en
 * `availableSizes` y las que no. Una talla que ya no aplica sin piezas (vacía o
 * en `0`) se descarta sin contarla como quitada: no había nada que perder.
 *
 * Al cambiar la categoría de una muestra se pasa la lista YA resuelta de la
 * nueva categoría (`resolveMuestraSizes`). Con una categoría sin tallas no se
 * poda (ver `getSettledDraftIds`).
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
    } else if (hasPieces(value)) {
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

/** Aviso en el panel de la fila cuando la lista de su categoría no cargó. */
export const MUESTRA_SIZES_ERROR_MESSAGE = "No se pudieron cargar las tallas de la categoría.";

/** Error corto de la fila (encabezado del acordeón) por la misma causa. */
export const MUESTRA_SIZES_ERROR = "No se cargaron las tallas";

/**
 * Aviso del panel de la fila cuando su categoría no ofrece ninguna talla
 * (#927): sin tallas configuradas o con todas desactivadas.
 */
export const MUESTRA_SIZES_EMPTY_MESSAGE =
  "La categoría de esta muestra no tiene tallas configuradas (o todas están desactivadas), así que no se le puede capturar ninguna.";

/** Qué hacer, en el alta de muestras: la categoría se elige en el paso anterior. */
export const MUESTRA_SIZES_EMPTY_ADD_HINT = "Regresa al paso anterior y elige otra categoría.";

/** Qué hacer, en una muestra guardada: su categoría no se puede cambiar en ningún lado. */
export const MUESTRA_SIZES_EMPTY_EDIT_HINT =
  "La categoría de una muestra guardada no se puede cambiar: quítala de la cotización y vuelve a agregarla con otra categoría.";

/** Error corto de la fila (encabezado del acordeón) por la misma causa. */
export const MUESTRA_SIZES_EMPTY = "La categoría no tiene tallas";

/**
 * Estado de las tallas de una fila de muestra cuando no hay tallas que
 * capturar: su lista carga (`loading`), no cargó (`error`) o cargó vacía
 * porque la categoría no ofrece ninguna (`empty`).
 */
export type MuestraSizesStatus = "loading" | "error" | "empty";

/** La fila espera su lista: no se confirma, pero tampoco se marca con error. */
export const MUESTRA_SIZES_PENDING = "pending";

/**
 * Por qué no se puede confirmar una fila de muestra: `null` si se puede,
 * `MUESTRA_SIZES_PENDING` mientras su lista carga (su panel ya lo dice, y un
 * error quedaría pegado cuando la lista llegue), o el mensaje de error de la
 * fila. Va antes de `validateSelectedRows`, que se salta las filas sin tallas
 * disponibles y dejaría pasar una muestra sin ninguna.
 */
export const getMuestraSizesBlock = (
  status: MuestraSizesStatus | null,
  incompatibleCount: number,
): typeof MUESTRA_SIZES_PENDING | string | null => {
  if (status === "loading") return MUESTRA_SIZES_PENDING;
  if (status === "error") return MUESTRA_SIZES_ERROR;
  if (status === "empty") return MUESTRA_SIZES_EMPTY;
  return incompatibleCount > 0 ? INCOMPATIBLE_SIZES_ERROR : null;
};

/**
 * De las muestras cuya categoría cambió, las que ya se pueden ajustar: las que
 * tienen su lista lista (`status === null`) y las que ya no existen (se
 * quitaron; solo hay que olvidarlas). Mientras la lista carga o falló no se
 * ajusta: se podaría contra una lista vacía y se perdería todo lo capturado.
 * Tampoco con una categoría sin tallas (`empty`): se perdería igual, y la fila
 * no se puede confirmar hasta que se elija otra categoría, momento en que se
 * poda contra la lista de esa.
 */
export const getSettledDraftIds = (
  changedDraftIds: Iterable<number>,
  sizesByDraft: ReadonlyMap<number, { status: MuestraSizesStatus | null }>,
): number[] =>
  [...changedDraftIds].filter((id) => {
    const muestraSizes = sizesByDraft.get(id);
    return !muestraSizes || muestraSizes.status === null;
  });
