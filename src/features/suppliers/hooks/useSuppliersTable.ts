"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { getSuppliersPage } from "../services/actions";
import {
  SUPPLIERS_TABLE_KEY,
  suppliersAdapter,
  suppliersTable,
} from "../utils/suppliersTableQueries";

// Prefijo y contrato viven en `suppliersTableQueries` (sin React, para el
// prefetch de Configuración); se reexportan para los importadores de siempre.
export { SUPPLIERS_TABLE_KEY, suppliersTable };

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
