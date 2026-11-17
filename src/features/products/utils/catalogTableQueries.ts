import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { serverTableDefaultQuery, type ServerTableRequest } from "@/src/utils/serverTableParams";
import type { Product } from "../interfaces/product.interface";
import type { ProductVariant } from "../../product-variants/interfaces/product-variant.interface";
import { getProductsPage } from "../services/actions";
import { getProductVariantsPage } from "../../product-variants/services/actions";
import { productsTable, productVariantsTable, toCatalogListApiParams } from "./catalogListParams";

/**
 * Consultas de las tablas de catálogo en modo servidor (EC-897), SIN React:
 * las leen los hooks de las tablas (`useProductsTable`,
 * `useProductVariantsTable`) y el prefetch de las tarjetas de Configuración,
 * que importa este módulo bajo demanda para no cargar los hooks de las tablas
 * en el menú. Una sola definición de prefijo, petición y adaptador por tabla.
 */

// A nivel de módulo: referencias estables entre renders.
export const productsAdapter = limitOffsetAdapter<Product>();
export const productVariantsAdapter = limitOffsetAdapter<ProductVariant>();

/**
 * Prefijo de la tabla de productos de un tipo (o de todos), bajo `["products"]`,
 * que ya invalidan alta, edición y baja.
 */
export const productsTableQueryKey = (tipoId: number | undefined) =>
  ["products", "table", tipoId ?? "todos"] as const;

/** Una página con los parámetros de la tabla, traducidos y con el tipo fijo. */
export const fetchProductsTablePage = (tipoId: number | undefined, params: ServerTableRequest) =>
  getProductsPage({
    ...toCatalogListApiParams(params),
    ...(tipoId !== undefined ? { tipo_id: tipoId } : {}),
  });

/**
 * Prefijo de las tablas de variantes, bajo la raíz `["product-variants"]` que
 * ya invalidan las mutaciones de variantes y de BOM.
 */
export const PRODUCT_VARIANTS_TABLE_KEY = ["product-variants", "table"] as const;

/** Una página con los parámetros de la tabla, traducidos (`rango_precio`). */
export const fetchProductVariantsTablePage = (params: ServerTableRequest) =>
  getProductVariantsPage(toCatalogListApiParams(params));

/** Vista por defecto de una tabla de productos (prefetch de Configuración). */
export const productsTableDefaultQuery = (tipoId?: number) =>
  serverTableDefaultQuery({
    definition: productsTable,
    adapter: productsAdapter,
    queryKey: productsTableQueryKey(tipoId),
    queryFn: (params) => fetchProductsTablePage(tipoId, params),
  });

/** Vista por defecto de la tabla de variantes (prefetch de Configuración). */
export const productVariantsTableDefaultQuery = () =>
  serverTableDefaultQuery({
    definition: productVariantsTable,
    adapter: productVariantsAdapter,
    queryKey: PRODUCT_VARIANTS_TABLE_KEY,
    queryFn: fetchProductVariantsTablePage,
  });
