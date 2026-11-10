"use client";

import { useMyCompanies } from "@/src/features/companies/hooks/useMyCompanies";
import type { Company } from "@/src/features/companies/interfaces/company.interface";
import { useSessionCompany } from "./useSessionCompany";

/**
 * Datos para MOSTRAR la empresa de la sesión (nombre, RFC). El id sale siempre
 * de la sesión; `mis-empresas/` solo se usa para buscarle el nombre, nunca como
 * fuente de la empresa (a un superusuario le lista todas).
 */
export function useSessionCompanyDetails() {
  const sessionCompany = useSessionCompany();
  const { companies, loading } = useMyCompanies();
  const company: Company | undefined =
    sessionCompany.status === "ready"
      ? companies.find((c) => c.id === sessionCompany.companyId)
      : undefined;
  const name =
    sessionCompany.status === "ready"
      ? company?.nombre_comercial ||
        company?.razon_social ||
        // Mientras carga `mis-empresas/` no se inventa un nombre.
        (loading ? null : `Empresa #${sessionCompany.companyId}`)
      : null;

  return {
    sessionCompany,
    company,
    /** Nombre para mostrar; `null` sin empresa confirmada o mientras carga. */
    name,
    isLoading: loading,
  };
}
