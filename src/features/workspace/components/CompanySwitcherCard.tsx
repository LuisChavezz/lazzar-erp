"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { BuildingIcon } from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import {
  sessionCompanySyncKey,
  useSessionCompanySyncStore,
} from "@/src/features/auth/stores/sessionCompanySync.store";
import type { Company } from "@/src/features/companies/interfaces/company.interface";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useSwitchCompany } from "@/src/features/companies/hooks/useSwitchCompany";
import { companyDisplayName, switchableCompanies } from "../utils/switchableCompanies";

interface CompanySwitcherCardProps {
  /** Empresa de la sesión; `null` si el superusuario no tiene. */
  companyId: number | null;
  /** `null` mientras se carga el nombre (o sin empresa). */
  name: string | null;
  rfc?: string | null;
}

/**
 * Empresa del workspace con selector, solo para superusuarios (EC-847). Los
 * demás usuarios ven `LockedCompanyCard`.
 *
 * Elegir otra empresa llama a `cambiar-empresa` y, si el backend la acepta,
 * cierra el cambio (`completeCompanySwitch`): la página se recarga en esta
 * misma ruta con la empresa nueva para elegir sucursal. Las opciones salen de
 * `mis-empresas/` (para el superusuario: las activas y la actual) sin la actual.
 *
 * El botón espera a que la sincronización de la empresa de esta carga
 * (`SessionCompanySync`) termine bien: una relectura de `/auth/user/` aún en
 * vuelo podría responder con la empresa anterior y escribirla en la sesión
 * encima del cambio, y es esa sincronización la que asigna la Dirección fiscal
 * anterior a EC-847 a la empresa en la que estaba el usuario.
 */
export default function CompanySwitcherCard({ companyId, name, rfc }: CompanySwitcherCardProps) {
  const { data: session, status } = useSession();
  const attempt = useSessionCompanySyncStore((state) => state.attempt);
  const syncKey = useSessionCompanySyncStore((state) => state.key);
  const syncStatus = useSessionCompanySyncStore((state) => state.status);
  const userId = status === "authenticated" ? session?.user?.id : undefined;
  const syncSettled =
    !!userId && syncKey === sessionCompanySyncKey(userId, attempt) && syncStatus === "done";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<Company | null>(null);
  // Se abre la confirmación al terminar de cerrarse el selector (ver `MainDialog.onCloseAutoFocus`).
  const [confirmPending, setConfirmPending] = useState(false);

  const { companies, loading, error } = useMyCompanies({ enabled: pickerOpen });
  const options = switchableCompanies(companies, companyId);
  const { switchCompany, isBusy } = useSwitchCompany();

  const handleConfirm = () => {
    if (!target?.id) return;
    switchCompany(target.id, { onError: () => setConfirmOpen(false) });
  };

  return (
    <div className="mb-8 flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 p-5 dark:border-slate-800 dark:bg-zinc-900/70">
      <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400">
        <BuildingIcon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Empresa activa</p>
        {companyId === null ? (
          <p className="text-lg font-bold text-slate-500 dark:text-slate-400">Sin empresa activa</p>
        ) : name ? (
          <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{name}</p>
        ) : (
          <div className="mt-1 h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        )}
        {rfc && <p className="text-xs text-slate-500 dark:text-slate-400">{rfc}</p>}
      </div>

      <Button
        variant="secondary"
        onClick={() => setPickerOpen(true)}
        disabled={!syncSettled || isBusy}
        title={syncSettled ? undefined : "Confirmando la empresa de tu usuario..."}
      >
        {isBusy ? "Cambiando..." : "Cambiar empresa"}
      </Button>

      <MainDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title=""
        maxWidth="640px"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (!confirmPending) return;
          event.preventDefault();
          setConfirmPending(false);
          setConfirmOpen(true);
        }}
      >
        {/* Se monta solo abierto: la selección tentativa arranca vacía. */}
        {pickerOpen && (
          <SingleSelectPickerDialogContent<Company>
            title="Cambiar empresa activa"
            subtitle="Todo el ERP trabaja con la empresa activa de tu usuario"
            items={options}
            isLoading={loading}
            isError={!!error}
            loadingTitle="Cargando empresas"
            loadingMessage="Obteniendo las empresas disponibles..."
            errorMessage={error ?? undefined}
            searchPlaceholder="Buscar por nombre, razón social o RFC..."
            filterPredicate={(company, term) =>
              `${company.nombre_comercial ?? ""} ${company.razon_social ?? ""} ${company.rfc ?? ""}`
                .toLowerCase()
                .includes(term)
            }
            getKey={(company) => company.id ?? 0}
            selectedKey={null}
            pinSelected
            emptyMessage="No hay otras empresas activas."
            noResultsMessage="No se encontraron empresas"
            renderContent={(company) => (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {companyDisplayName(company)}
                </p>
                {company.rfc && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{company.rfc}</p>
                )}
              </div>
            )}
            onConfirm={(company) => {
              setTarget(company);
              setConfirmPending(true);
              setPickerOpen(false);
            }}
            onCancel={() => setPickerOpen(false)}
          />
        )}
      </MainDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isBusy) setConfirmOpen(open);
        }}
        title="¿Cambiar de empresa?"
        description={`Pasarás a trabajar en ${target ? companyDisplayName(target) : "la empresa elegida"}. Se reinician tu sucursal por defecto y tus sucursales y departamentos asignados, el cambio aplica a todas tus sesiones abiertas y tendrás que elegir sucursal de nuevo.`}
        confirmText={isBusy ? "Cambiando..." : "Cambiar empresa"}
        confirmColor="blue"
        closeOnConfirm={false}
        busy={isBusy}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
