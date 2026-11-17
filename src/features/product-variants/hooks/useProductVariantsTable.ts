"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import type { ServerTableDefinition } from "@/src/utils/serverTableParams";
import { productVariantsTable } from "@/src/features/products/utils/catalogListParams";
import {
  fetchProductVariantsTablePage,
  PRODUCT_VARIANTS_TABLE_KEY,
  productVariantsAdapter,
} from "@/src/features/products/utils/catalogTableQueries";

/**
 * Tabla de variantes en MODO SERVIDOR (EC-897): filtros, búsqueda, orden y
 * página en la URL (`useServerTable`), así que quien la monta la envuelve en
 * `<Suspense>`. Vive en `["product-variants", "table", "list", params]`
 * (`catalogTableQueries`). Configuración y Producción comparten la llave: los
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
