import type { Company } from "@/src/features/companies/interfaces/company.interface";

/** Nombre con que se muestra una empresa: el comercial, o la razón social. */
export const companyDisplayName = (company: Pick<Company, "nombre_comercial" | "razon_social">): string =>
  company.nombre_comercial || company.razon_social;

/**
 * Empresas a las que el superusuario puede cambiarse (EC-847): las de
 * `mis-empresas/` (para él, las activas más la actual aunque esté inactiva)
 * sin la actual, que no es un cambio. Sin `id` no se puede pedir, así que
 * tampoco se ofrece.
 */
export const switchableCompanies = <T extends Pick<Company, "id">>(
  companies: readonly T[],
  currentCompanyId: number | null
): T[] =>
  companies.filter((company) => typeof company.id === "number" && company.id !== currentCompanyId);
