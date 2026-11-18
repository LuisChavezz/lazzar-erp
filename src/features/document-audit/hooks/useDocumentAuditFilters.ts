"use client";

import { useUrlFilters } from "@/src/hooks/useUrlFilters";
import { DOCUMENT_AUDIT_TABLE } from "../constants/documentAuditTable";

/**
 * Filtros de la bitácora con la URL como fuente de verdad (`useUrlFilters`):
 * se leen con `useSearchParams` (la página debe envolver la vista en
 * `<Suspense>`) y se escriben con `history.replaceState`, partiendo de la
 * query ACTUAL del navegador para que dos cambios seguidos no se pisen. Cada
 * valor se valida por separado: uno inválido en la URL se trata como ausente,
 * y un cambio que invertiría el rango de fechas no se escribe.
 */
export const useDocumentAuditFilters = () => useUrlFilters(DOCUMENT_AUDIT_TABLE);
