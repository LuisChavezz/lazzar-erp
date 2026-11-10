import type { CompanyLabel } from "../store/workspace.store";

/** Vigencia del nombre guardado: pasado este tiempo se vuelve a consultar `mis-empresas/`. */
export const COMPANY_LABEL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Qué nombre de empresa mostrar y si hay que buscarlo en `mis-empresas/`
 * (EC-842), a partir del nombre guardado en el store.
 *
 * - Store sin hidratar o empresa sin confirmar: nada que mostrar ni buscar.
 * - Nombre guardado para ESA empresa y vigente: se usa, sin consultar.
 * - Nombre guardado para esa empresa pero caducado (o de antes de que se
 *   guardara la fecha): se sigue mostrando mientras se revalida.
 * - Nombre de otra empresa o ninguno: se busca.
 */
export function resolveCompanyLabel({
  hasHydrated,
  companyId,
  storedLabel,
  now,
  maxAgeMs = COMPANY_LABEL_MAX_AGE_MS,
}: {
  hasHydrated: boolean;
  companyId: number | null;
  storedLabel: CompanyLabel | null;
  now: number;
  maxAgeMs?: number;
}): { label: CompanyLabel | null; needsLookup: boolean } {
  if (!hasHydrated || companyId === null) return { label: null, needsLookup: false };
  if (!storedLabel || storedLabel.id !== companyId) return { label: null, needsLookup: true };
  const fresh =
    typeof storedLabel.fetchedAt === "number" && now - storedLabel.fetchedAt < maxAgeMs;
  return { label: storedLabel, needsLookup: !fresh };
}
