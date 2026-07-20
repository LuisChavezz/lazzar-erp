"use client";

import { useSatInfo } from "../hooks/useSatInfo";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { regimenesFiscalesColumns } from "./SatInfoColumns";
import { Tabs } from "@radix-ui/themes";
import { FiscalAddressDetails } from "./FiscalAddressDetails";

export const SatInfo = () => {
  const { data, isLoading, isError, error } = useSatInfo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Configuración Fiscal
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Administra tus datos fiscales y consulta los catálogos del SAT.
        </p>
      </div>

      <Tabs.Root defaultValue="regimenes">
        <Tabs.List>
          <Tabs.Trigger value="regimenes" className="cursor-pointer! text-slate-900! dark:text-white!">
            Regímenes Fiscales
          </Tabs.Trigger>
          <Tabs.Trigger value="direccion" className="cursor-pointer! text-slate-900! dark:text-white!">
            Dirección Fiscal
          </Tabs.Trigger>
        </Tabs.List>

        <div className="mt-6">
          <Tabs.Content value="regimenes">
            <DataTable
              columns={regimenesFiscalesColumns}
              data={data?.regimenes_fiscales ?? []}
              searchPlaceholder="Buscar régimen..."
              title="Regímenes Fiscales"
              isLoading={isLoading}
              isError={isError}
              errorTitle="Error al cargar información"
              errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
              loadingAriaLabel="Cargando catálogos del SAT"
            />
          </Tabs.Content>

          <Tabs.Content value="direccion">
             <FiscalAddressDetails />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};
