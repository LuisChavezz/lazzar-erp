"use client";

import { useServerTable } from "@/src/hooks/useServerTable";
import { limitOffsetAdapter } from "@/src/utils/serverListAdapters";
import type { CustomerListItem } from "../interfaces/customer.interface";
import { getCustomersPage } from "../services/actions";
import { CUSTOMERS_TABLE_KEY, customersTable } from "../utils/customerList";

// A nivel de módulo: una referencia estable entre renders.
const customersAdapter = limitOffsetAdapter<CustomerListItem>();

/**
 * Listado de clientes de Ventas en modo servidor (estado en la URL: la página
 * que lo monta lo envuelve en `<Suspense>`). Contrato en `customersTable`.
 *
 * `cacheDefaultView`: la vista por defecto (página 1, sin búsqueda, orden por
 * defecto) se conserva 30 min en caché, como las demás listas de Ventas y
 * Compras en modo servidor; cada búsqueda u orden conserva el `gcTime` global.
 */
export const useCustomersTable = () =>
  useServerTable({
    definition: customersTable,
    queryKey: CUSTOMERS_TABLE_KEY,
    queryFn: getCustomersPage,
    adapter: customersAdapter,
    toastId: "customers-table-refetch-error",
    refetchErrorMessage: "No se pudieron actualizar los clientes. Se muestran los datos anteriores.",
    loadErrorMessage: "No se pudieron cargar los clientes.",
    cacheDefaultView: true,
  });
