"use client";

import { useSatInfo } from "../hooks/useSatInfo";
import { DataTable } from "@/src/components/DataTable";
import { Tabs } from "@radix-ui/themes";
import {
  regimenesFiscalesColumns,
  usosCfdiColumns,
  metodosPagoColumns,
  formasPagoColumns,
} from "./SatInfoColumns";

export const SatInfo = () => {
  const { data, isLoading, isError, error } = useSatInfo();

  if (isLoading) {
    return (
      <div className="p-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando catálogos del SAT...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar información</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Catálogos SAT
        </h2>
        <p className="text-slate-500 dark:text-slate-400">
          Información fiscal actualizada utilizada para facturación y contabilidad.
        </p>
      </div>

      <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <Tabs.Root defaultValue="regimenes">
          <Tabs.List>
            <Tabs.Trigger value="regimenes" className="cursor-pointer! text-slate-900! dark:text-white!">Regímenes Fiscales</Tabs.Trigger>
            <Tabs.Trigger value="usos_cfdi" className="cursor-pointer! text-slate-900! dark:text-white!">Usos CFDI</Tabs.Trigger>
            <Tabs.Trigger value="metodos_pago" className="cursor-pointer! text-slate-900! dark:text-white!">Métodos de Pago</Tabs.Trigger>
            <Tabs.Trigger value="formas_pago" className="cursor-pointer! text-slate-900! dark:text-white!">Formas de Pago</Tabs.Trigger>
          </Tabs.List>

          <div className="mt-6">
            <Tabs.Content value="regimenes">
              <DataTable
                columns={regimenesFiscalesColumns}
                data={data.regimenes_fiscales}
                searchPlaceholder="Buscar régimen..."
              />
            </Tabs.Content>

            <Tabs.Content value="usos_cfdi">
              <DataTable
                columns={usosCfdiColumns}
                data={data.usos_cfdi}
                searchPlaceholder="Buscar uso CFDI..."
              />
            </Tabs.Content>

            <Tabs.Content value="metodos_pago">
              <DataTable
                columns={metodosPagoColumns}
                data={data.metodos_pago}
                searchPlaceholder="Buscar método de pago..."
              />
            </Tabs.Content>

            <Tabs.Content value="formas_pago">
              <DataTable
                columns={formasPagoColumns}
                data={data.formas_pago}
                searchPlaceholder="Buscar forma de pago..."
              />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>
    </div>
  );
};
