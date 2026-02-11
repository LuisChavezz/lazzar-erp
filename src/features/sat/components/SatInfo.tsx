"use client";

import { useSatInfo } from "../hooks/useSatInfo";
import { DataTable } from "@/src/components/DataTable";
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
            {isLoading ? (
              <div className="p-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                <span className="ml-3 text-slate-500">Cargando catálogos del SAT...</span>
              </div>
            ) : isError ? (
              <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
                <p className="font-medium">Error al cargar información</p>
                <p className="text-sm opacity-80">{(error as Error).message}</p>
              </div>
            ) : data ? (
              <DataTable
                columns={regimenesFiscalesColumns}
                data={data.regimenes_fiscales}
                searchPlaceholder="Buscar régimen..."
                title="Regímenes Fiscales"
              />
            ) : null}
          </Tabs.Content>

          <Tabs.Content value="direccion">
             <FiscalAddressDetails />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};
