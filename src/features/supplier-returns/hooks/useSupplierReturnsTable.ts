"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import { defineServerTable, enumParam, positiveIdParam } from "@/src/utils/serverTableParams";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";
import { getSupplierReturnsPage } from "../services/actions";
import { SUPPLIER_RETURN_ESTATUS_VALUES, SUPPLIER_RETURNS_KEY } from "../constants/supplierReturns";

/**
 * Contrato del listado con `GET /compras/devoluciones-proveedor/`
 * (nucleo-erp#1413): paginación opcional `limit`/`offset`, `?search=` (folio,
 * folio de la recepción y de la OC, nombre y razón social del proveedor) y
 * `?ordering=` con lista blanca. El default reproduce el del backend
 * (`-fecha, -id`).
 *
 * - `estatus` es uno de `aplicada`/`cancelada`; `proveedor` un id (un id no
 *   entero daría `400`, por eso `positiveIdParam`).
 * - Recepción, inspección y OC también son filtros del endpoint, pero la tabla
 *   no los ofrece: sus columnas solo ordenan.
 */
export const supplierReturnsTable = defineServerTable({
  filters: {
    estatus: enumParam(SUPPLIER_RETURN_ESTATUS_VALUES),
    proveedor: positiveIdParam,
  },
  search: { param: "search" },
  ordering: {
    // Sin `proveedor__nombre`: ordenaría por el nombre comercial una columna que
    // muestra la razón social (ver `supplierReturnColumns`).
    fields: ["folio", "fecha", "estatus", "total", "recepcion__folio", "orden_compra__folio"],
    default: "-fecha",
    tiebreaker: "-id",
  },
});

// A nivel de módulo: una referencia estable entre renders.
const supplierReturnsAdapter = limitOffsetAdapter<SupplierReturn>();

/** Listado de devoluciones a proveedor en modo servidor (estado en la URL). */
export const useSupplierReturnsTable = () =>
  useServerTable({
    definition: supplierReturnsTable,
    queryKey: SUPPLIER_RETURNS_KEY,
    queryFn: getSupplierReturnsPage,
    adapter: supplierReturnsAdapter,
    toastId: "supplier-returns-table-refetch-error",
    refetchErrorMessage:
      "No se pudieron actualizar las devoluciones. Se muestran los datos anteriores.",
  });
