"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { QuickFilterChips } from "@/src/components/QuickFilterChips";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import {
  buildOperationsCustomerFilterOptions,
  getOperationsCustomerColumns,
  telefonoDe,
} from "./OperationsCustomerColumns";
import { useOperationsCustomers } from "../hooks/useOperationsCustomers";
import type { OperationsCustomer } from "../interfaces/operations-customer.interface";

/**
 * Atajos de un clic sobre la tabla. Filtran el arreglo que recibe `DataTable`
 * (el catálogo llega completo) y se combinan con la búsqueda y los filtros de
 * encabezado.
 */
const QUICK_FILTERS: {
  key: string;
  label: string;
  dotClassName: string;
  matches: (customer: OperationsCustomer) => boolean;
}[] = [
  { key: "todos", label: "Todos", dotClassName: "bg-slate-400", matches: () => true },
  { key: "activos", label: "Activos", dotClassName: "bg-emerald-500", matches: (c) => c.activo },
  { key: "inactivos", label: "Inactivos", dotClassName: "bg-slate-400", matches: (c) => !c.activo },
  { key: "sin-correo", label: "Sin correo", dotClassName: "bg-amber-500", matches: (c) => !c.correo?.trim() },
  { key: "sin-telefono", label: "Sin teléfono", dotClassName: "bg-rose-500", matches: (c) => !telefonoDe(c)?.trim() },
];

export const OperationsCustomerList = () => {
  const { customers, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useOperationsCustomers();
  const [quickFilterKey, setQuickFilterKey] = useState("todos");
  const quickFilter = QUICK_FILTERS.find((f) => f.key === quickFilterKey) ?? QUICK_FILTERS[0];

  // Un error de refetch transitorio no debe descartar la tabla ya cargada;
  // solo se trata como error "de pantalla completa" si nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  // Altura acotada a la ventana (mismo cálculo que el resto de Mesa de
  // Control) + `fillHeight`: la tabla usa toda la pantalla y scrollea por
  // dentro.
  return (
    <div className="h-[calc(100dvh-128px)] min-h-[480px] flex flex-col gap-3">
      <QuickFilterChips
        label="Atajos de filtro de clientes"
        value={quickFilterKey}
        onChange={setQuickFilterKey}
        chips={QUICK_FILTERS.map((filter) => ({
          key: filter.key,
          label: filter.label,
          dotClassName: filter.dotClassName,
          count: hasLoaded ? customers.filter(filter.matches).length : undefined,
        }))}
      />
      <DataTable
        columns={getOperationsCustomerColumns(buildOperationsCustomerFilterOptions(customers))}
        data={customers.filter(quickFilter.matches)}
        baseDataCount={customers.length}
        fillHeight
        searchPlaceholder="Buscar cliente, RFC o contacto…"
        onRefetch={refetch}
        isRefetching={isFetching}
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar los clientes"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando clientes"
      />
    </div>
  );
};
