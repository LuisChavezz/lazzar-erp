"use client";

import { useEffect, useState } from "react";
import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import { useWorkspaceStore } from "../store/workspace.store";
import { resolveCompanyLabel } from "../utils/resolveCompanyLabel";
import { useSessionCompany } from "./useSessionCompany";

/**
 * Datos para MOSTRAR la empresa de la sesión (nombre, RFC). El id sale siempre
 * de la sesión; el nombre se busca en `mis-empresas/` (nunca como fuente de la
 * empresa: a un superusuario le lista todas) y se guarda en el store junto con
 * ese id y la fecha. Mientras sea de la empresa de la sesión y esté vigente,
 * `mis-empresas/` no se vuelve a pedir; caducado se revalida mostrando el
 * guardado mientras tanto (`resolveCompanyLabel`).
 */
export function useSessionCompanyDetails() {
  const sessionCompany = useSessionCompany();
  const companyId = sessionCompany.companyId;
  const storedLabel = useWorkspaceStore((state) => state.companyLabel);
  const setCompanyLabel = useWorkspaceStore((state) => state.setCompanyLabel);
  const hasHydrated = useWorkspaceStore((state) => state.hasHydrated);
  // Hora de referencia de este montaje: la vigencia se evalúa al montar.
  const [now] = useState(() => Date.now());

  const { label, needsLookup } = resolveCompanyLabel({ hasHydrated, companyId, storedLabel, now });
  const { companies, loading } = useMyCompanies({ enabled: needsLookup });

  const found = needsLookup ? companies.find((c) => c.id === companyId) : undefined;
  const foundName = found ? found.nombre_comercial || found.razon_social : undefined;
  const foundRfc = found?.rfc ?? null;

  useEffect(() => {
    if (companyId !== null && foundName) {
      setCompanyLabel({ id: companyId, name: foundName, rfc: foundRfc, fetchedAt: Date.now() });
    }
  }, [companyId, foundName, foundRfc, setCompanyLabel]);

  const lookupPending = !hasHydrated || loading;
  const name =
    companyId === null
      ? null
      : (foundName ??
        label?.name ??
        // Mientras se busca no se inventa un nombre.
        (lookupPending ? null : `Empresa #${companyId}`));

  return {
    sessionCompany,
    /** Nombre para mostrar; `null` sin empresa confirmada o mientras se busca. */
    name,
    rfc: found ? foundRfc : (label?.rfc ?? null),
  };
}
