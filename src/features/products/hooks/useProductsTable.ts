"use client";

import { useServerTable, type ServerTableRequest } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import type { ServerTableDefinition } from "@/src/utils/serverTableParams";
import type { Product } from "../interfaces/product.interface";
import { getProductsPage } from "../services/actions";
import { productsTable, toCatalogListApiParams } from "../utils/catalogListParams";

// A nivel de módulo: una referencia estable entre renders.
const productsAdapter = limitOffsetAdapter<Product>();

interface UseProductsTableOptions {
  /**
   * `tipo_id` fijo de la tabla (3 = PT en Configuración, 2 = materia prima en
   * Materiales); sin él, todos los tipos (Producción). No es un filtro de la
   * URL: va siempre, y la llave lo incluye para que cada tabla tenga su caché.
   */
  tipoId?: number;
  /**
   * `productsTable` o una copia con prefijo de URL (`withUrlPrefix`), creada a
   * nivel de módulo: debe ser una referencia estable.
   */
  definition?: ServerTableDefinition<typeof productsTable.filters>;
  toastId: string;
}

/**
 * Tabla de productos en MODO SERVIDOR (EC-897): filtros, búsqueda, orden y
 * página en la URL (`useServerTable`), así que quien la monta la envuelve en
 * `<Suspense>`.
 *
 * Vive en `["products", "table", tipo, "list", params]`, bajo el prefijo
 * `["products"]` que ya invalidan alta, edición y baja. La baja optimista
 * (`useDeleteProduct`) solo toca entradas que son arreglos, así que estas
 * páginas (un sobre `{count, results}`) se refrescan con su invalidación.
 */
export const useProductsTable = ({
  tipoId,
  definition = productsTable,
  toastId,
}: UseProductsTableOptions) =>
  useServerTable({
    definition,
    queryKey: ["products", "table", tipoId ?? "todos"],
    queryFn: (params: ServerTableRequest) =>
      getProductsPage({
        ...toCatalogListApiParams(params),
        ...(tipoId !== undefined ? { tipo_id: tipoId } : {}),
      }),
    adapter: productsAdapter,
    toastId,
    refetchErrorMessage: "No se pudieron actualizar los productos. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los productos.",
  });
