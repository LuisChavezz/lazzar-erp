"use client";

import { useEffect } from "react";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useWorkspaceStore } from "../store/workspace.store";
import { useSessionCompany } from "./useSessionCompany";

/**
 * Datos para MOSTRAR la empresa de la sesión (nombre, RFC). El id sale siempre
 * de la sesión; el nombre se busca en `mis-empresas/` (nunca como fuente de la
 * empresa: a un superusuario le lista todas) y se guarda en el store junto con
 * ese id. Mientras el nombre guardado sea del id de la sesión, `mis-empresas/`
 * no se vuelve a pedir; si la empresa cambia, el id no coincide y se busca de
 * nuevo.
 */
export function useSessionCompanyDetails() {
  const sessionCompany = useSessionCompany();
  const companyId = sessionCompany.companyId;
  const storedLabel = useWorkspaceStore((state) => state.companyLabel);
  const setCompanyLabel = useWorkspaceStore((state) => state.setCompanyLabel);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);

  const label = companyId !== null && storedLabel?.id === companyId ? storedLabel : null;
  // Se espera a hidratar el store: antes de eso no se sabe si ya hay un nombre.
  const needsLookup = hasHydrated && companyId !== null && !label;
  const { companies, loading } = useMyCompanies({ enabled: needsLookup });

  const found = needsLookup ? companies.find((c) => c.id === companyId) : undefined;
  const foundName = found ? found.nombre_comercial || found.razon_social : undefined;
  const foundRfc = found?.rfc ?? null;

  useEffect(() => {
    if (companyId !== null && foundName) {
      setCompanyLabel({ id: companyId, name: foundName, rfc: foundRfc });
    }
  }, [companyId, foundName, foundRfc, setCompanyLabel]);

  const lookupPending = !hasHydrated || loading;
  const name =
    companyId === null
      ? null
      : (label?.name ??
        foundName ??
        // Mientras se busca no se inventa un nombre.
        (lookupPending ? null : `Empresa #${companyId}`));

  return {
    sessionCompany,
    /** Nombre para mostrar; `null` sin empresa confirmada o mientras se busca. */
    name,
    rfc: label?.rfc ?? foundRfc,
  };
}
