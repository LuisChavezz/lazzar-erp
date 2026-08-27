"use client";

import { useSatStore } from "../stores/sat.store";
import { MainDialog } from "@/src/components/MainDialog";
import FiscalAddressForm from "./FiscalAddressForm";
import { useState } from "react";
import { MapPinIcon, EditIcon, BuildingIcon } from "@/src/components/Icons";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";

export const FiscalAddressDetails = () => {
  const { fiscalAddress } = useSatStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: session } = useSession();

  // Alta/edición de la dirección fiscal: `E-CONFIGURACION` del catálogo.
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Dirección Fiscal Actual
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Esta es la dirección que se utilizará para la emisión de facturas.
          </p>
        </div>

        {canEdit && (
          <MainDialog
          title={
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                  {fiscalAddress ? "Editar Dirección Fiscal" : "Registrar Dirección Fiscal"}
                </h1>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {fiscalAddress ? "Actualización de datos" : "Registro Nuevo"}
                  </p>
                </div>
              </div>
            </div>
          }
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="800px"
          trigger={
            <button
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-2"
            >
              <EditIcon className="w-4 h-4" />
              {fiscalAddress ? "Editar Dirección" : "Registrar Dirección"}
            </button>
          }
        >
          <FiscalAddressForm onSuccess={() => setIsDialogOpen(false)} />
        </MainDialog>
        )}
      </div>

      {!fiscalAddress ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <MapPinIcon className="w-6 h-6 text-slate-400" />
          </div>
          <h4 className="text-slate-900 dark:text-white font-medium mb-1">
            No hay dirección fiscal registrada
          </h4>
          <p className="text-sm text-slate-500 max-w-sm">
            Registra una dirección fiscal para habilitar todas las funciones de facturación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tarjeta Principal: Dirección */}
          <div className="lg:col-span-2 bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <MapPinIcon className="w-4 h-4" />
                </span>
                Ubicación
              </h4>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-6">
               <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Calle
                  </label>
                  <p className="text-lg font-medium text-slate-900 dark:text-white wrap-break-word">
                      {fiscalAddress.calle}
                  </p>
              </div>
              
              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Número Exterior
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                      {fiscalAddress.numero_exterior}
                  </p>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Número Interior
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                      {fiscalAddress.numero_interior || <span className="text-slate-400 italic">-</span>}
                  </p>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Colonia
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                      {fiscalAddress.colonia}
                  </p>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Código Postal
                  </label>
                  <div className="ml-1 inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-sm font-medium">
                    {fiscalAddress.codigo_postal}
                  </div>
              </div>
            </div>
          </div>

          {/* Tarjeta Secundaria: Detalles Regionales */}
          <div className="bg-white dark:bg-black rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/5">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <BuildingIcon className="w-4 h-4" />
                </span>
                Región
              </h4>
            </div>
            <div className="p-6 flex flex-col gap-6 h-full">
               <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Municipio / Alcaldía
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                      {fiscalAddress.municipio}
                  </p>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Estado
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white">
                      {fiscalAddress.estado}
                  </p>
              </div>

              <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      País
                  </label>
                  <p className="text-base font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      {fiscalAddress.pais}
                      {fiscalAddress.pais === "México" && <span className="text-lg">🇲🇽</span>}
                  </p>
              </div>

              {fiscalAddress.localidad && (
                <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Localidad
                    </label>
                    <p className="text-base font-medium text-slate-900 dark:text-white">
                        {fiscalAddress.localidad}
                    </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
