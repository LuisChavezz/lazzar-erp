/**
 * useSizesState.ts
 * Hook responsable de manejar las cantidades por talla para los productos
 * seleccionados en el diálogo. Mantiene un mapa: productId => { sizeId => cantidad }.
 * - `updateSizeQuantity` guarda la cantidad TAL COMO SE CAPTURÓ (texto).
 * - `validateSelectedRows` verifica que cada cantidad sea un entero ≥ 0 y que
 *   cada producto tenga al menos una talla > 0.
 * - `getItemSizes` construye la lista de tallas para envío en el payload.
 *
 * La cantidad se guarda como texto y no como número para poder RECHAZAR lo que
 * no es un entero: antes se truncaba con `Math.floor` al teclear, así que `1.5`
 * se convertía en `1` sin aviso (EC-563, CO-01).
 */
import { useCallback, useState } from "react";
import type { Size } from "../../sizes/interfaces/size.interface";
import { MUESTRA_ROW_ID } from "../types";
import type { CatalogRow, QuoteItem } from "../types";

/** Cantidades capturadas por producto: productId => { sizeId => texto }. */
export type SizeQuantitiesMap = Record<number, Record<number, string>>;

export const SIZE_QUANTITY_ERROR = "Debe ser un número entero mayor o igual a 0";

/** Tope de `PositiveIntegerField` (la cantidad por talla en el backend). */
export const SIZE_QUANTITY_MAX = 2147483647;

export const SIZE_QUANTITY_MAX_ERROR = `No puede ser mayor a ${SIZE_QUANTITY_MAX.toLocaleString("es-MX")}`;

const SIZE_QUANTITY_REGEX = /^\d+$/;

/**
 * Error de una cantidad capturada, o `null`. Vacío equivale a 0. El tope se
 * revisa aquí porque el error del backend llegaría a una ruta sin input.
 */
export const getSizeQuantityError = (raw: string | undefined): string | null => {
  const value = (raw ?? "").trim();
  if (value === "") return null;
  if (!SIZE_QUANTITY_REGEX.test(value)) return SIZE_QUANTITY_ERROR;
  return Number(value) > SIZE_QUANTITY_MAX ? SIZE_QUANTITY_MAX_ERROR : null;
};

/** Valor numérico de una cantidad VÁLIDA; vacía o inválida cuenta 0. */
export const parseSizeQuantity = (raw: string | undefined): number =>
  getSizeQuantityError(raw) === null ? Number((raw ?? "").trim() || 0) : 0;

/**
 * buildInitialSizeMap
 * Construye el mapa inicial de cantidades por talla a partir de un `QuoteItem`.
 *
 * El mapa se indexa por `productoId`, que una partida de MUESTRA no tiene
 * (`null` por contrato). Para esas se usa la clave sintética `MUESTRA_ROW_ID`,
 * la misma que el diálogo de alta emplea para su fila sintética, de modo que
 * quien edite sus tallas pueda leer las cantidades ya capturadas.
 *
 * El cambio es ADITIVO: solo `productoId === null` toma la rama nueva. Un
 * `productoId` de catálogo (>= 1) recorre exactamente el camino de antes, y
 * `0`/`undefined` siguen devolviendo `{}` como siempre. Una muestra rehidratada
 * en edición también llega con `productoId: null` y toma la rama sintética.
 */
const buildInitialSizeMap = (item?: QuoteItem | null): SizeQuantitiesMap => {
  if (!item?.tallas) return {};

  // `=== null` y no `??`: `undefined` debe seguir cayendo en `{}` como siempre.
  const key = item.productoId === null ? MUESTRA_ROW_ID : item.productoId;
  if (!key) return {};

  // Sin truncar: la cantidad guardada se muestra tal cual y, si no fuera un
  // entero, la validación lo dice en vez de corregirlo en silencio.
  const map: Record<number, string> = {};
  item.tallas.forEach((talla) => {
    map[talla.tallaId] = talla.cantidad == null ? "" : String(talla.cantidad);
  });

  return { [key]: map };
};

export interface UseSizesStateParams {
  initialItem?: QuoteItem | null;
}
/**
 * useSizesState
 * Provee el estado y operaciones para manejar tallas y cantidades por producto.
 * Retorna:
 * - `sizeQuantitiesPerProduct`: mapa de cantidades.
 * - `sizeErrors`: errores por producto.
 * - `updateSizeQuantity`, `validateSelectedRows`, `getItemSizes`, `reset`.
 */
export function useSizesState({ initialItem }: UseSizesStateParams) {
  const [sizeQuantitiesPerProduct, setSizeQuantitiesPerProduct] = useState<SizeQuantitiesMap>(
    () => buildInitialSizeMap(initialItem)
  );
  const [sizeErrors, setSizeErrors] = useState<Record<number, string>>({});

  const updateSizeQuantity = useCallback(
    (productId: number, sizeId: number, value: string) => {
      setSizeQuantitiesPerProduct((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] ?? {}),
          [sizeId]: value,
        },
      }));

      setSizeErrors((prev) => {
        if (!prev[productId]) return prev;
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    },
    []
  );

  const clearProductSizes = useCallback((productId: number) => {
    setSizeQuantitiesPerProduct((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setSizeErrors((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const validateSelectedRows = useCallback((
    selectedRows: CatalogRow[],
    availableSizesPerProduct?: Record<number, Size[]>
  ) => {
    let hasSizeErrors = false;
    const nextErrors: Record<number, string> = {};

    for (const row of selectedRows) {
      // Si no hay tallas disponibles para el producto, se omite la validación
      const availableSizes = availableSizesPerProduct?.[row.id];
      if (availableSizes !== undefined && availableSizes.length === 0) {
        continue;
      }
      const quantities = Object.values(sizeQuantitiesPerProduct[row.id] ?? {});
      if (quantities.some((qty) => getSizeQuantityError(qty) !== null)) {
        nextErrors[row.id] = "Cantidad inválida";
        hasSizeErrors = true;
        continue;
      }
      const total = quantities.reduce((sum, qty) => sum + parseSizeQuantity(qty), 0);
      if (total <= 0) {
        nextErrors[row.id] = "Sin tallas";
        hasSizeErrors = true;
      }
    }

    setSizeErrors(nextErrors);
    return !hasSizeErrors;
  }, [sizeQuantitiesPerProduct]);

  const getItemSizes = useCallback((productId: number, sizes: Size[]) => {
    const quantities = sizeQuantitiesPerProduct[productId] ?? {};
    return sizes
      .map((size) => ({ ...size, cantidad: parseSizeQuantity(quantities[size.id]) }))
      .filter((size) => size.cantidad > 0);
  }, [sizeQuantitiesPerProduct]);

  const reset = useCallback((item?: QuoteItem | null) => {
    setSizeQuantitiesPerProduct(buildInitialSizeMap(item));
    setSizeErrors({});
  }, []);

  return {
    sizeQuantitiesPerProduct,
    sizeErrors,
    updateSizeQuantity,
    clearProductSizes,
    validateSelectedRows,
    getItemSizes,
    reset,
  };
}
