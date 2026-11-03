"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { FormSelect } from "@/src/components/FormSelect";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { accountingCustomerColumns } from "./AccountingCustomerColumns";
import { useAccountingCustomers } from "../hooks/useAccountingCustomers";

/** Qué clientes lista la vista: los activos (por defecto del backend) o los dados de baja. */
type AccountingCustomerEstatus = "activos" | "bajas";

export const AccountingCustomerList = () => {
  // El estatus es un filtro de SERVIDOR (`?activo=false`), no de la tabla: el
  // backend devuelve activos o dados de baja, nunca ambos, y `DataTable` filtra
  // solo en memoria sobre lo que recibe. Por eso vive fuera de ella, como
  // control propio que cambia la consulta.
  const [estatus, setEstatus] = useState<AccountingCustomerEstatus>("activos");
  const activo = estatus === "activos";
  const { customers, isLoading, isInitialError, error, refetch, isFetching } =
    useAccountingCustomers({ activo });

  return (
    <div className="h-full flex flex-col min-h-0 space-y-4">
      <section className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 p-5">
        <FormSelect
          label="Estatus"
          name="estatus"
          value={estatus}
          onChange={(event) => setEstatus(event.target.value as AccountingCustomerEstatus)}
          options={[
            { value: "activos", label: "Activos" },
            { value: "bajas", label: "Dados de baja" },
          ]}
        />
      </section>

      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          columns={accountingCustomerColumns}
          data={customers}
          baseDataCount={customers.length}
          searchPlaceholder="Buscar por nombre, razón social, RFC o correo..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          isLoading={isLoading}
          // Solo si la vista pedida nunca cargó (`isInitialError`): un refetch
          // fallido conserva la tabla y avisa por toast.
          isError={isInitialError}
          errorTitle="Error al cargar los clientes"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          onErrorRetry={refetch}
          emptyMessage={activo ? "No hay clientes activos." : "No hay clientes dados de baja."}
          loadingAriaLabel="Cargando clientes"
          getRowId={(row) => String(row.id)}
          // Cambiar de estatus vuelve a la página 1 sin perder orden, búsqueda ni columnas.
          paginationResetKey={estatus}
        />
      </div>
    </div>
  );
};
