"use client";

import { useState } from "react";
import { Button } from "@/src/components/Button";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { MainDialog } from "@/src/components/MainDialog";
import { SingleSelectPickerDialogContent } from "@/src/components/SingleSelectPickerDialogContent";
import type { Company } from "@/src/features/companies/interfaces/company.interface";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useSwitchCompany } from "@/src/features/companies/hooks/useSwitchCompany";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import type { SessionCompany } from "../hooks/useSessionCompany";
import { companyDisplayName, switchableCompanies } from "../utils/switchableCompanies";
import CompanyCard from "./CompanyCard";

interface CompanySwitcherCardProps {
  /** Empresa de la sesión (`useSessionCompany`); `companyId` `null` si no tiene. */
  sessionCompany: SessionCompany;
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
 * (`SessionCompanySync`, `sessionCompany.sync`) termine bien: una relectura de `/auth/user/` aún en
 * vuelo podría responder con la empresa anterior y escribirla en la sesión
 * encima del cambio, y es esa sincronización la que asigna la Dirección fiscal
 * anterior a EC-847 a la empresa en la que estaba el usuario. Si esa
 * sincronización falla, la tarjeta lo dice y ofrece reintentarla.
 */
export default function CompanySwitcherCard({ sessionCompany, name, rfc }: CompanySwitcherCardProps) {
  const companyId = sessionCompany.companyId;
  const { sync, retrySync } = sessionCompany;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [target, setTarget] = useState<Company | null>(null);
  // Se abre la confirmación al terminar de cerrarse el selector (ver `MainDialog.onCloseAutoFocus`).
  const [confirmPending, setConfirmPending] = useState(false);

  const { companies, loading, error } = useMyCompanies({ enabled: pickerOpen });
  const options = switchableCompanies(companies, companyId);
  const { switchCompany, isBusy } = useSwitchCompany();
  // La empresa elegida, copiada al ABRIR la confirmación (CLAUDE.md).
  const confirmSession = useDialogSession(confirmOpen, target);
  const confirmTarget = confirmSession.snapshot;

  const handleConfirm = () => {
    if (!confirmTarget?.id) return;
    switchCompany(confirmTarget.id, { onError: () => setConfirmOpen(false) });
  };

  const action =
    sync === "failed" ? (
      <Button variant="secondary" onClick={retrySync}>
        Reintentar
      </Button>
    ) : (
      <Button
        variant="secondary"
        onClick={() => setPickerOpen(true)}
        disabled={sync !== "done" || isBusy}
        title={sync === "done" ? undefined : "Confirmando la empresa de tu usuario..."}
      >
        {isBusy ? "Cambiando..." : "Cambiar empresa"}
      </Button>
    );

  return (
    <>
      <CompanyCard
        label="Empresa activa"
        name={companyId === null ? null : name}
        emptyName={companyId === null ? "Sin empresa activa" : undefined}
        rfc={rfc}
        detail={
          sync === "failed" && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              No se pudo confirmar la empresa de tu usuario; reinténtalo para poder cambiarla.
            </p>
          )
        }
        action={action}
      />

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
        key={confirmSession.id}
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isBusy) setConfirmOpen(open);
        }}
        title="¿Cambiar de empresa?"
        description={`Pasarás a trabajar en ${confirmTarget ? companyDisplayName(confirmTarget) : "la empresa elegida"}. Se reinician tu sucursal por defecto y tus sucursales y departamentos asignados, el cambio aplica a todas tus sesiones abiertas y tendrás que elegir sucursal de nuevo.`}
        confirmText={isBusy ? "Cambiando..." : "Cambiar empresa"}
        confirmColor="blue"
        closeOnConfirm={false}
        busy={isBusy}
        onConfirm={handleConfirm}
      />
    </>
  );
}
