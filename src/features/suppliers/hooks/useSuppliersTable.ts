"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { defineServerTable } from "@/src/utils/serverTableParams";
import type { Supplier } from "../interfaces/supplier.interface";
import { getSuppliersPage } from "../services/actions";

/**
 * Prefijo de la tabla de proveedores: vive en `["suppliers", "list", params]`.
 * El CATÁLOGO completo sigue en la llave exacta `["suppliers"]` (`useSuppliers`,
 * que leen formularios y selectores; `useSupplier` y `useDeleteSupplier` lo
 * tratan como `Supplier[]`), y esta tabla nunca la escribe. Alta, edición y
 * baja ya invalidan el prefijo `["suppliers"]`, así que refrescan las dos.
 */
export const SUPPLIERS_TABLE_KEY = ["suppliers"] as const;

/**
 * Contrato del listado con `GET /terceros/proveedores/` (nucleo-erp #863).
 *
 * - Solo búsqueda (`search`: código, nombre, razón social y RFC) y orden. El
 *   endpoint no acepta filtros por proveedor, razón social, tipo de persona ni
 *   contacto, así que la tabla no los ofrece.
 * - `activo` no se envía: el default del backend lista solo activos, como
 *   antes (la baja de un proveedor lo saca del listado).
 * - `ordering`: los campos de las columnas, todos en la lista blanca del
 *   backend; el default reproduce el suyo (`-fecha_alta, -id`).
 */
export const suppliersTable = defineServerTable({
  filters: {},
  search: { param: "search" },
  ordering: {
    fields: ["nombre", "razon_social", "rfc", "email"],
    default: "-fecha_alta",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const suppliersAdapter = limitOffsetAdapter<Supplier>();

/** Listado de proveedores en modo servidor (estado en la URL). */
export const useSuppliersTable = () =>
  useServerTable({
    definition: suppliersTable,
    queryKey: SUPPLIERS_TABLE_KEY,
    queryFn: getSuppliersPage,
    adapter: suppliersAdapter,
    toastId: "suppliers-table-refetch-error",
    refetchErrorMessage:
      "No se pudieron actualizar los proveedores. Se muestran los datos anteriores.",
  });
