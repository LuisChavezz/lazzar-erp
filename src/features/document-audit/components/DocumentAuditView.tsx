"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/src/components/Button";
import { RefreshIcon } from "@/src/components/Icons";
import { useCompanyBranches } from "@/src/features/branches/hooks/useCompanyBranches";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { findCurrency } from "@/src/features/currency/utils/currencyLookup";
import { useUserCatalog } from "@/src/features/users/hooks/useUserCatalog";
import { useSessionCompanyId } from "@/src/features/workspace/hooks/useSessionCompany";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { meetsPermissionRequirement } from "@/src/utils/permissions";
import { DOCUMENT_AUDIT_PERMISSION } from "../constants/documentAuditValues";
import { resolveDocumentAuditTarget } from "../constants/documentAuditOpeners";
import { useDocumentAuditFilters } from "../hooks/useDocumentAuditFilters";
import { useDocumentAuditList } from "../hooks/useDocumentAuditList";
import { toDocumentAuditParams } from "../schemas/documentAuditFilters.schema";
import { DocumentAuditDocumentDialog, type OpenAuditDocument } from "./DocumentAuditDocumentDialog";
import { DocumentAuditFilters } from "./DocumentAuditFilters";
import { DocumentAuditTable } from "./DocumentAuditTable";

/**
 * "Bitácora de documentos" (`/system/document-audit`): un renglón por evento
 * (alta, cambio de estatus, baja, restauración o borrado) de los documentos del
 * ERP, del más reciente al más antiguo, con "Cargar más" siguiendo el cursor.
 *
 * La regla de la ruta y el `CompanyGate` ya garantizan permiso y empresa; la
 * consulta los vuelve a exigir para no salir nunca sin ellos. El diálogo de un
 * documento abierto vive AQUÍ, no en la celda: las filas se remontan al cargar
 * más o al cambiar de filtros.
 */
export function DocumentAuditView() {
  const { data: session } = useSession();
  const companyId = useSessionCompanyId();
  const canRead = meetsPermissionRequirement(DOCUMENT_AUDIT_PERMISSION, session?.user);
  const { filters, setFilter, hasActiveFilters, clearFilters } = useDocumentAuditFilters();
  const params = toDocumentAuditParams(filters);
  const list = useDocumentAuditList(params, companyId, { enabled: canRead });

  const userCatalog = useUserCatalog(companyId, { enabled: canRead });
  const { branches, isLoading: isBranchesLoading } = useCompanyBranches(companyId);
  const { data: currencies } = useCurrencies();

  const [openDocument, setOpenDocument] = useState<OpenAuditDocument | null>(null);
  // Remonta los filtros al limpiar, para que el borrador del folio no sobreviva.
  const [filtersKey, setFiltersKey] = useState(0);
  const handleClearFilters = () => {
    clearFilters();
    setFiltersKey((key) => key + 1);
  };

  const branchNames = new Map(branches.map((branch) => [branch.id, branch.nombre]));

  return (
    <div className="w-full space-y-6">
      <p className="text-slate-500 dark:text-slate-400">
        Historial de altas, cambios de estatus, bajas y borrados de los documentos de la empresa,
        del más reciente al más antiguo.
      </p>

      <DocumentAuditFilters
        key={filtersKey}
        filters={filters}
        setFilter={setFilter}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        users={userCatalog.users}
        isUsersLoading={userCatalog.isLoading}
        isUsersError={userCatalog.isInitialError}
        branches={branches}
        isBranchesLoading={isBranchesLoading}
      />

      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void list.refetch()}
            disabled={list.isFetching || list.isLoading}
            className="inline-flex items-center gap-2"
          >
            <RefreshIcon
              className={`w-4 h-4 ${list.isFetching && !list.isFetchingNextPage ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Actualizar
          </Button>
        </div>

        <DocumentAuditTable
          rows={list.rows}
          getTarget={(event) => resolveDocumentAuditTarget(event, session?.user)}
          onOpenDialog={(target) => setOpenDocument({ tipo: target.tipo, id: target.id })}
          getBranchName={(sucursalId) => branchNames.get(sucursalId) ?? null}
          getCurrencyCode={(monedaId) => findCurrency(currencies, monedaId)?.codigo_iso ?? null}
          isLoading={list.isLoading}
          isError={list.isInitialError}
          errorMessage={extractErrorMessage(list.error, "No se pudo cargar la bitácora.")}
          onRetry={() => void list.refetch()}
          isTransitioning={list.isTransitioning}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearFilters}
        />

        {list.hasLoaded && list.rows.length > 0 && (
          <div className="flex flex-col items-center gap-2 py-2">
            {list.isLoadMoreError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                No se pudieron cargar más eventos.
              </p>
            )}
            {list.hasNextPage ? (
              <Button
                type="button"
                variant="secondary"
                rounded="full"
                onClick={() => void list.loadMore()}
                disabled={list.isFetchingNextPage || list.isTransitioning}
              >
                {list.isFetchingNextPage
                  ? "Cargando..."
                  : list.isLoadMoreError
                    ? "Reintentar"
                    : "Cargar más"}
              </Button>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {list.rows.length === 1
                  ? "1 evento. No hay más."
                  : `${list.rows.length} eventos. No hay más.`}
              </p>
            )}
          </div>
        )}
      </div>

      {openDocument && (
        <DocumentAuditDocumentDialog document={openDocument} onClose={() => setOpenDocument(null)} />
      )}
    </div>
  );
}
