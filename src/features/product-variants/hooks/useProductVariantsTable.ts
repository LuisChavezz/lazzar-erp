"use client";

import { useServerTable, type ServerTableRequest } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import {
  readServerTableState,
  toServerTableCriteria,
  type ServerTableDefinition,
} from "@/src/utils/serverTableParams";
import {
  productVariantsTable,
  toCatalogListApiParams,
} from "@/src/features/products/utils/catalogListParams";
import type { ProductVariant } from "../interfaces/product-variant.interface";
import { getProductVariantsPage } from "../services/actions";

// A nivel de módulo: una referencia estable entre renders.
const productVariantsAdapter = limitOffsetAdapter<ProductVariant>();

/**
 * Prefijo de las tablas de variantes: `["product-variants", "table", "list",
 * params]`, bajo la raíz `["product-variants"]` que ya invalidan las
 * mutaciones de variantes y de BOM. La baja optimista
 * (`useDeleteProductVariant`) solo toca entradas que son arreglos, así que
 * estas páginas se refrescan con su invalidación.
 */
const PRODUCT_VARIANTS_TABLE_KEY = ["product-variants", "table"] as const;

/** Una página con los parámetros de la tabla, traducidos (`rango_precio`). */
const fetchProductVariantsTablePage = (params: ServerTableRequest) =>
  getProductVariantsPage(toCatalogListApiParams(params));

/**
 * Llave y petición de la VISTA POR DEFECTO de la tabla de variantes (página 1,
 * sin filtros ni búsqueda, orden `-id`), para el prefetch de la tarjeta de
 * Configuración. La llave es la misma que arma `useServerTable`
 * (`[...prefijo, "list", petición]`), así que la tabla la lee al abrirse.
 */
export const productVariantsTableDefaultQuery = () => {
  const state = readServerTableState(productVariantsTable, () => null);
  const request: ServerTableRequest = {
    ...toServerTableCriteria(productVariantsTable, state),
    ...productVariantsAdapter.paginationParams({ page: state.page, pageSize: state.pageSize }),
  };
  return {
    queryKey: [...PRODUCT_VARIANTS_TABLE_KEY, "list", request],
    queryFn: () => fetchProductVariantsTablePage(request),
  };
};

/**
 * Tabla de variantes en MODO SERVIDOR (EC-897): filtros, búsqueda, orden y
 * página en la URL (`useServerTable`), así que quien la monta la envuelve en
 * `<Suspense>`. Configuración y Producción comparten la llave: los
 * parámetros (sin el prefijo de la URL) son los mismos.
 *
 * `definition`: `productVariantsTable` o una copia con prefijo de URL
 * (`withUrlPrefix`), creada a nivel de módulo.
 */
export const useProductVariantsTable = ({
  definition = productVariantsTable,
  toastId,
}: {
  definition?: ServerTableDefinition<typeof productVariantsTable.filters>;
  toastId: string;
}) =>
  useServerTable({
    definition,
    queryKey: PRODUCT_VARIANTS_TABLE_KEY,
    queryFn: fetchProductVariantsTablePage,
    adapter: productVariantsAdapter,
    toastId,
    refetchErrorMessage: "No se pudieron actualizar las variantes. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar las variantes.",
  });
